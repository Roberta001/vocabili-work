import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, FileDown, Search } from 'lucide-react';
import MarkingCard from '@/components/MarkingCard';
import { exportToExcel } from '@/utils/excel';
import { toast } from 'sonner';

// Define the record type based on usage
interface RecordType {
  [key: string]: any;
  include?: string | boolean; // '收录' or boolean
}

export default function Mark() {
  const [allRecords, setAllRecords] = useState<RecordType[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [includeEntries, setIncludeEntries] = useState<boolean[]>([]);
  const [allIncluded, setAllIncluded] = useState(false);
  const [status, setStatus] = useState<'waiting' | 'loading' | 'loaded'>('waiting');
  const [svmode, setSvmode] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpenSearch((open) => !open)
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
     const newRecords = [...allRecords];
     newRecords[index] = updatedRecord;
     setAllRecords(newRecords);
  };

  // Handle export
  const handleExport = () => {
    exportToExcel(allRecords, includeEntries, svmode);
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

  return (
    <div className="flex flex-col items-center p-6 w-full max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">数据库STAFF打标</h1>
      
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
              
              <Button onClick={handleExport} variant="outline" className="gap-2">
                 <FileDown className="h-4 w-4" />
                 导出Excel
              </Button>
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

          <div className="grid grid-cols-1 gap-6">
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
                   
                   {/* Simple pagination logic for brevity - can be enhanced */}
                   <div className="flex items-center px-4 text-sm font-medium">
                      Page {currentPage} of {totalPages}
                   </div>

                   <PaginationItem>
                      <PaginationNext 
                         onClick={() => handlePageChange(currentPage + 1)}
                         className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                   </PaginationItem>
                </PaginationContent>
             </Pagination>
          )}
        </div>
      )}
    </div>
  );
}
