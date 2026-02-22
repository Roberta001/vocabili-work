import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, FileDown, Search, Bookmark as BookmarkIcon, Trash2, Upload, Download, FileSignature, LayoutGrid, LayoutList } from 'lucide-react';
import MarkingCard from '@/components/MarkingCard';
import { exportToExcel } from '@/utils/excel';
import { toast } from 'sonner';
import { BookmarksProvider, useBookmarks } from '@/contexts/BookmarksContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

// Define the record type based on usage
interface RecordType {
  [key: string]: any;
  include?: string | boolean; // '收录' or boolean
}

// Inner component to access context
function MarkContent() {
  const [allRecords, setAllRecords] = useState<RecordType[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [includeEntries, setIncludeEntries] = useState<boolean[]>([]);
  const [allIncluded, setAllIncluded] = useState(false);
  const [status, setStatus] = useState<'waiting' | 'loading' | 'loaded'>('waiting');
  const [svmode, setSvmode] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [gridLayout, setGridLayout] = useState(false); // false: list (1 col), true: grid (2 cols)
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { bookmarks, clearBookmarks, importBookmarks, exportBookmarks, updateBookmarkNote, addBookmarksBatch } = useBookmarks();
  const bookmarkInputRef = useRef<HTMLInputElement>(null);

  // Export options
  const [keepExcluded, setKeepExcluded] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  // Incomplete records warning
  const [incompleteDialogOpen, setIncompleteDialogOpen] = useState(false);
  const [incompleteIndices, setIncompleteIndices] = useState<number[]>([]);

  // Keyboard shortcut for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpenSearch((open) => !open)
      }
      if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setBookmarkOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])
  
  const handleJumpToRecord = (index: number) => {
     const page = Math.floor(index / pageSize) + 1;
     setCurrentPage(page);
     setOpenSearch(false);
     
     // Wait for render then scroll
     setTimeout(() => {
        const element = document.getElementById(`record-${index}`);
        if (element) {
           element.scrollIntoView({ behavior: 'smooth', block: 'center' });
           // Flash effect
           element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
           setTimeout(() => element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2000);
        } else {
           toast.warning("跳转目标未在当前页面渲染，请手动翻页");
        }
     }, 100);
  };

  // Computed paged data
  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allRecords.slice(start, start + pageSize);
  }, [allRecords, currentPage, pageSize]);

  const totalPages = Math.ceil(allRecords.length / pageSize);

  // Handle file upload with worker
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = (file: File) => {
    setStatus('loading');
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;

      // Use the worker
      const worker = new Worker(new URL('../workers/xlsxWorker.ts', import.meta.url), { type: 'module' });
      worker.postMessage({ file: arrayBuffer });

      worker.onmessage = (event) => {
        const records = event.data;
        setAllRecords(records);
        
        let initialIncludes: boolean[] = [];
        if (records.length > 0) {
          if (svmode) {
             if (records[0].include) {
                initialIncludes = records.map((item: any) => item.include === '收录');
             } else {
                initialIncludes = new Array(records.length).fill(true);
             }
          } else if (records[0].status) {
             // For normal mode, include if status is done or auto
             initialIncludes = records.map((item: any) => ['done', 'auto'].includes(item.status));
          } else {
             // Default logic from original code
             initialIncludes = records.map((item: any) => !!item.synthesizer);
          }
        }
        
        setIncludeEntries(initialIncludes);
        setCurrentPage(1);
        worker.terminate();
        setStatus('loaded');
        console.log("Parsing complete, records:", records.length);
      };
      
      worker.onerror = (err) => {
         console.error(err);
         setStatus('waiting');
      };
    };
    reader.readAsArrayBuffer(file);
  };
  
  // Handle Select All toggle
  const handleChangeAll = (checked: boolean) => {
    setAllIncluded(checked);
    const newIncludes = [...includeEntries].map(() => checked);
    setIncludeEntries(newIncludes);
  };

  // Handle individual include toggle
  const handleIncludeChange = (index: number, checked: boolean) => {
    const newIncludes = [...includeEntries];
    newIncludes[index] = checked;
    setIncludeEntries(newIncludes);
  };

  // Handle record update from card
  const handleRecordUpdate = (index: number, updatedRecord: any) => {
     setAllRecords(prev => {
        const newRecords = [...prev];
        const newObj = typeof updatedRecord === 'function' ? updatedRecord(prev[index]) : updatedRecord;
        if (newRecords[index] === newObj) return prev;
        newRecords[index] = newObj;
        return newRecords;
     });
  };

  const getRequiredFields = (isSvmode: boolean) => {
    if (isSvmode) {
      return ['synthesizer', 'copyright'];
    }
    return ['name', 'vocal', 'author', 'synthesizer', 'copyright', 'type'];
  };

  const getProblematicRecords = () => {
    const reqFields = getRequiredFields(svmode);
    const tagFields = svmode ? ['synthesizer'] : ['vocal', 'author', 'synthesizer'];
    
    const incomplete: number[] = [];
    const unconfirmed: number[] = [];

    allRecords.forEach((record, index) => {
      if (includeEntries[index]) {
        const isComplete = reqFields.every(field => {
          const val = record[field];
          return val !== undefined && val !== null && val !== '';
        });
        if (!isComplete) {
          incomplete.push(index);
        }

        const hasUnconfirmed = tagFields.some(field => {
          const val = record[`_unconfirmed_${field}`];
          return !!val && val.trim() !== '';
        });
        if (hasUnconfirmed) {
          unconfirmed.push(index);
        }
      }
    });

    return { incomplete, unconfirmed };
  };

  // Handle export
  const handleExport = () => {
    if (!keepExcluded) {
      const { incomplete, unconfirmed } = getProblematicRecords();
      if (incomplete.length > 0 || unconfirmed.length > 0) {
        setIncompleteIndices([...new Set([...incomplete, ...unconfirmed])]);
        setExportDialogOpen(false);
        setIncompleteDialogOpen(true);
        return;
      }
    }
    performExport();
  };

  const performExport = () => {
    exportToExcel(allRecords, includeEntries, svmode, keepExcluded);
    setExportDialogOpen(false);
    setIncompleteDialogOpen(false);
  };

  const getRecordIssues = (record: any) => {
    const issues: string[] = [];
    const reqFields = getRequiredFields(svmode);
    const tagFields = svmode ? ['synthesizer'] : ['vocal', 'author', 'synthesizer'];
    
    const fieldLabels: Record<string, string> = {
      name: '歌名',
      vocal: '歌手',
      author: '作者',
      synthesizer: svmode ? '榜单' : '引擎',
      copyright: '版权',
      type: '类别'
    };

    reqFields.forEach(field => {
      const val = record[field];
      if (val === undefined || val === null || val === '') {
        issues.push(`${fieldLabels[field]}未填写`);
      }
    });

    tagFields.forEach(field => {
      const val = record[`_unconfirmed_${field}`];
      if (!!val && val.trim() !== '') {
        issues.push(`${fieldLabels[field]}栏存在内容未确认`);
      }
    });

    return issues.join('，');
  };

  const handleAddIncompleteToBookmarks = () => {
    const bookmarksToAdd = incompleteIndices.map(idx => ({
      index: idx,
      title: allRecords[idx].title || allRecords[idx].name || '未命名',
      note: getRecordIssues(allRecords[idx]) || '信息未填写完整（导出时标记）'
    }));
    addBookmarksBatch(bookmarksToAdd);
    setIncompleteDialogOpen(false);
    
    // Jump to the first incomplete record
    if (incompleteIndices.length > 0) {
      handleJumpToRecord(incompleteIndices[0]);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Prevent unload warning
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allRecords.length > 0) {
         event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [allRecords]);
  
  // Handle bookmark import
  const handleBookmarkImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importBookmarks(file);
    }
    // Reset value to allow re-importing same file
    if (event.target) event.target.value = '';
  };
  
  // Bookmark Note component for sidebar
  const BookmarkItem = ({ bookmark }: { bookmark: any }) => {
     const [isNoteOpen, setIsNoteOpen] = useState(false);
     const [noteText, setNoteText] = useState(bookmark.note || '');
     
     const handleSaveNote = () => {
        updateBookmarkNote(bookmark.index, noteText);
        setIsNoteOpen(false);
        toast.success("备注已更新");
     };

     return (
       <div 
         className="flex flex-col p-3 rounded-md border hover:bg-muted/50 transition-colors group relative"
       >
         <div className="cursor-pointer" onClick={() => handleJumpToRecord(bookmark.index)}>
            <span className="font-medium line-clamp-1">{bookmark.title}</span>
            <span className="text-xs text-muted-foreground">索引: {bookmark.index + 1}</span>
            {bookmark.note && (
               <div className="mt-1 text-xs text-muted-foreground bg-muted p-1 rounded line-clamp-2">
                  备注: {bookmark.note}
               </div>
            )}
         </div>
         
         <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Popover open={isNoteOpen} onOpenChange={setIsNoteOpen}>
               <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                     <FileSignature className="h-3 w-3" />
                  </Button>
               </PopoverTrigger>
               <PopoverContent className="w-80" side="left">
                  <div className="grid gap-4">
                     <div className="space-y-2">
                        <h4 className="font-medium leading-none">编辑备注</h4>
                     </div>
                     <div className="grid gap-2">
                        <Textarea 
                           value={noteText}
                           onChange={(e) => setNoteText(e.target.value)}
                           placeholder="输入备注..."
                           className="h-24"
                        />
                        <Button size="sm" onClick={handleSaveNote}>保存备注</Button>
                     </div>
                  </div>
               </PopoverContent>
            </Popover>
         </div>
       </div>
     );
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => handlePageChange(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // First page is always visible
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => handlePageChange(1)}
            isActive={currentPage === 1}
            className="cursor-pointer"
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Determine range
      let startPage = Math.max(2, currentPage - 2);
      let endPage = Math.min(totalPages - 1, currentPage + 2);

      if (currentPage <= 4) {
        endPage = 5;
      } else if (currentPage >= totalPages - 3) {
        startPage = totalPages - 4;
      }

      // Add start ellipsis
      if (startPage > 2) {
        items.push(
          <PaginationItem key="start-ellipsis">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => handlePageChange(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      // Add end ellipsis
      if (endPage < totalPages - 1) {
        items.push(
          <PaginationItem key="end-ellipsis">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Last page is always visible
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => handlePageChange(totalPages)}
            isActive={currentPage === totalPages}
            className="cursor-pointer"
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <div className="flex flex-col items-center p-6 w-full max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between w-full items-center">
        <h1 className="text-3xl font-bold tracking-tight">数据库STAFF打标</h1>
        
        {/* Bookmarks Drawer */}
        <Sheet open={bookmarkOpen} onOpenChange={setBookmarkOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2" title="快捷键: ⌘B / Ctrl+B">
              <BookmarkIcon className="h-4 w-4" />
              书签 ({bookmarks.length})
            </Button>
          </SheetTrigger>
          <SheetContent onCloseAutoFocus={(e) => e.preventDefault()}>
            <SheetHeader>
              <SheetTitle>书签列表</SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-4">
              <div className="flex gap-2 justify-between">
                <Button variant="outline" size="sm" onClick={exportBookmarks} title="导出书签">
                  <Download className="h-4 w-4" />
                </Button>
                <div className="relative">
                   <Button variant="outline" size="sm" className="relative" title="导入书签">
                      <Upload className="h-4 w-4" />
                      <input 
                         type="file" 
                         accept=".json" 
                         className="absolute inset-0 opacity-0 cursor-pointer"
                         onChange={handleBookmarkImport}
                         ref={bookmarkInputRef}
                      />
                   </Button>
                </div>
                <Button variant="destructive" size="sm" onClick={clearBookmarks} title="清空书签">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Separator />
              <ScrollArea className="h-[calc(100vh-200px)]">
                {bookmarks.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">
                    暂无书签
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bookmarks.map((bookmark) => (
                      <BookmarkItem key={bookmark.index} bookmark={bookmark} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      
      {/* Controls Area */}
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
        {status === 'waiting' && (
          <div className="flex items-center space-x-2">
            <Switch id="svmode" checked={svmode} onCheckedChange={setSvmode} />
            <Label htmlFor="svmode">SV榜模式</Label>
          </div>
        )}
        
        <div className="flex gap-2 items-center">
           <Input 
              ref={fileInputRef} 
              type="file" 
              accept=".xlsx, .xls"
              onChange={handleFileChange} 
              className="max-w-xs cursor-pointer"
           />
        </div>

        {allRecords.length > 0 && (
           <div className="flex gap-2">
              <Button 
                 variant="outline" 
                 size="icon"
                 title={gridLayout ? "切换为单列列表" : "切换为双列网格"}
                 onClick={() => setGridLayout(!gridLayout)}
                 className="hidden md:flex"
              >
                 {gridLayout ? <LayoutList className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </Button>

              <Button 
                variant="outline" 
                className="w-full justify-between text-muted-foreground sm:w-64"
                onClick={() => setOpenSearch(true)}
              >
                 <span className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    <span>搜索歌曲...</span>
                 </span>
                 <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                    <span className="text-xs">⌘</span>K
                 </kbd>
              </Button>
              
              <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                 <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                       <FileDown className="h-4 w-4" />
                       导出Excel
                    </Button>
                 </DialogTrigger>
                 <DialogContent>
                    <DialogHeader>
                       <DialogTitle>导出选项</DialogTitle>
                       <DialogDescription>
                          请选择导出文件的格式和内容
                       </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 py-4">
                       <Checkbox 
                          id="keepExcluded" 
                          checked={keepExcluded} 
                          onCheckedChange={(checked) => setKeepExcluded(checked as boolean)} 
                       />
                       <label
                          htmlFor="keepExcluded"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                       >
                          保留未收录的歌曲（标记为"排除"）
                       </label>
                    </div>
                    <DialogFooter>
                       <Button variant="outline" onClick={() => setExportDialogOpen(false)}>取消</Button>
                       <Button onClick={handleExport}>确认导出</Button>
                    </DialogFooter>
                 </DialogContent>
              </Dialog>

              <Dialog open={incompleteDialogOpen} onOpenChange={setIncompleteDialogOpen}>
                 <DialogContent>
                    <DialogHeader>
                       <DialogTitle className="text-destructive">存在未填写完成的歌曲</DialogTitle>
                       <DialogDescription>
                          您有 {incompleteIndices.length} 首勾选了"收录"的歌曲存在以下问题：
                          <br/>
                          - 存在未填写的字段（如歌名、版权等）
                          <br/>
                          - 或者是标签框（歌手/作者/引擎）内有文字但未按回车确认添加。
                          <br/><br/>
                          如果不保留排除项，将可能导致导出的数据不完整或丢失未确认的标签。
                       </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                       <p className="text-sm font-medium mb-2">建议的操作：</p>
                       <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                          <li>将这些歌曲一键添加到书签，方便您跳转和修改</li>
                          <li>或者您可以选择无视警告强制导出</li>
                       </ul>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                       <Button variant="outline" onClick={() => setIncompleteDialogOpen(false)}>取消</Button>
                       <Button variant="destructive" onClick={performExport}>强制导出</Button>
                       <Button onClick={handleAddIncompleteToBookmarks} className="bg-blue-600 hover:bg-blue-700 text-white">
                          <BookmarkIcon className="h-4 w-4 mr-2" />
                          添加书签并跳转
                       </Button>
                    </DialogFooter>
                 </DialogContent>
              </Dialog>
           </div>
        )}
      </div>

      <CommandDialog open={openSearch} onOpenChange={setOpenSearch}>
        <CommandInput placeholder="输入标题、P主或歌手搜索..." />
        <CommandList>
          <CommandEmpty>未找到结果.</CommandEmpty>
          <CommandGroup heading="歌曲列表">
            {allRecords.map((record, index) => (
              <CommandItem
                key={index}
                value={`${record.title || ''} ${record.producer || ''} ${record.vocalist || ''} ${record.bvid || ''} ${index}`}
                onSelect={() => handleJumpToRecord(index)}
              >
                <div className="flex flex-col">
                   <span className="font-medium">{record.title}</span>
                   <span className="text-xs text-muted-foreground">
                      {record.producer ? `P主: ${record.producer} ` : ''}
                      {record.vocalist ? `歌手: ${record.vocalist}` : ''}
                   </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {status === 'loading' && (
         <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>正在解析文件...</p>
         </div>
      )}

      {/* Content Area */}
      {allRecords.length > 0 && (
        <div className="w-full space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b">
            <Switch 
               id="select-all" 
               checked={allIncluded} 
               onCheckedChange={handleChangeAll} 
            />
            <Label htmlFor="select-all">全选/全不选 (共 {allRecords.length} 条)</Label>
          </div>

          <div className={`grid gap-6 ${gridLayout ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {pagedData.map((record, i) => {
              const realIndex = (currentPage - 1) * pageSize + i;
              return (
                <MarkingCard
                  key={realIndex} // Use real index as key to maintain state stability
                  index={realIndex}
                  record={record}
                  include={includeEntries[realIndex]}
                  onIncludeChange={(val) => handleIncludeChange(realIndex, val)}
                  svmode={svmode}
                  onUpdate={(updated) => handleRecordUpdate(realIndex, updated)}
                />
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
             <Pagination>
                <PaginationContent>
                   <PaginationItem>
                      <PaginationPrevious 
                         onClick={() => handlePageChange(currentPage - 1)} 
                         className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                   </PaginationItem>
                   
                   {renderPaginationItems()}

                   <PaginationItem>
                      <PaginationNext 
                         onClick={() => handlePageChange(currentPage + 1)}
                         className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                   </PaginationItem>
                   
                   <div className="flex items-center gap-2 ml-4">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">前往:</span>
                      <Input
                         type="number"
                         min={1}
                         max={totalPages}
                         className="w-16 h-8 text-center px-1"
                         onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                               const page = parseInt(e.currentTarget.value);
                               if (!isNaN(page) && page >= 1 && page <= totalPages) {
                                  handlePageChange(page);
                                  e.currentTarget.value = '';
                               }
                            }
                         }}
                      />
                   </div>
                </PaginationContent>
             </Pagination>
          )}
        </div>
      )}
    </div>
  );
}

export default function Mark() {
   return (
      <BookmarksProvider>
         <MarkContent />
      </BookmarksProvider>
   );
}
