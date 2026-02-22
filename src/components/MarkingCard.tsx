import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { PlayCircle, Loader2, Bookmark, FileSignature } from 'lucide-react';
import MarkingTags from './MarkingTags';
import MarkingNameInput from './MarkingNameInput';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { toast } from 'sonner';
import { useBookmarks } from '@/contexts/BookmarksContext';

interface MarkingCardProps {
  record: any;
  include: boolean;
  onIncludeChange: (value: boolean) => void;
  index: number;
  svmode: boolean;
  onUpdate: (record: any) => void;
}

export default function MarkingCard({ record, include, onIncludeChange, index, svmode, onUpdate }: MarkingCardProps) {
  // Video preview states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const { isBookmarked, toggleBookmark, getBookmark, updateBookmarkNote } = useBookmarks();
  
  // Note state for popover
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  
  // Sync note text when opening popover
  useEffect(() => {
    if (noteOpen) {
      const bookmark = getBookmark(index);
      setNoteText(bookmark?.note || '');
    }
  }, [noteOpen, index, getBookmark]);

  const handleSaveNote = () => {
    if (isBookmarked(index)) {
       updateBookmarkNote(index, noteText);
       toast.success("备注已保存");
    } else {
       toggleBookmark(index, record.title, noteText);
    }
    setNoteOpen(false);
  };

  const handleBookmarkClick = () => {
     if (isBookmarked(index)) {
        toggleBookmark(index, record.title);
     } else {
        // If adding, just add directly without note first
        toggleBookmark(index, record.title);
     }
  };

  const reqFields = svmode ? ['synthesizer', 'copyright'] : ['name', 'vocal', 'author', 'synthesizer', 'copyright', 'type'];

  const isFieldEmpty = (field: string) => {
    const val = record[field];
    return val === undefined || val === null || String(val).trim() === '';
  };

  const showFieldError = (field: string) => {
    return include && reqFields.includes(field) && isFieldEmpty(field);
  };

  const handleChange = (field: string, value: any) => {
    onUpdate((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (field: string, value: string) => {
    const unconfirmedKey = `_unconfirmed_${field}`;
    onUpdate((prev: any) => {
      if (prev[unconfirmedKey] === value) return prev;
      return { ...prev, [unconfirmedKey]: value };
    });
  };

  const loadVideoPreview = async () => {
     if (videoUrl) return; // Already loaded
     
     const bvid = record.bvid || (record.aid ? `av${record.aid}` : '');
     if (!bvid) {
        toast.error("无法获取视频ID");
        return;
     }

     setPreviewLoading(true);
     try {
        const targetUrl = `https://www.bilibili.com/video/${bvid}`;
        const res = await axios.get(`https://api.xingzhige.com/API/b_parse/?url=${targetUrl}`);
        
        if (res.data && res.data.code === 0 && res.data.data?.video?.url) {
           setVideoUrl(res.data.data.video.url);
        } else {
           toast.error("解析视频失败: " + (res.data?.msg || "未知错误"));
        }
     } catch (error) {
        console.error(error);
        toast.error("请求视频解析接口失败");
     } finally {
        setPreviewLoading(false);
     }
  };

  const fields = svmode ? [
    { type:'tags', label: '榜单', prop: 'synthesizer' },
    { type:'select', label: '版权', prop: 'copyright', options: [
      {value:1, label: '自制'},
      {value:2, label: '转载'},
      {value:3, label: '自制（3）'},
      {value:101, label: '转载投自制'},
      {value:100, label: '自制投转载'},
    ]},
  ] : [
    { type:'string-hint', label: '歌名', prop: 'name' },
    { type:'tags-hint', label: '歌手', prop: 'vocal', search: 'vocalist' },
    { type:'tags-hint', label: '作者', prop: 'author', search: 'producer' },
    { type:'tags-hint', label: '引擎', prop: 'synthesizer', search: 'synthesizer' },
    { type:'select', label: '版权', prop: 'copyright', options: [
      {value:1, label: '自制'},
      {value:2, label:'转载'},
      {value:3, label: '自制（3）'},
      {value:101, label: '转载投自制'},
      {value:100, label: '自制投转载'},
    ]},
    { type:'select', label: '类别', prop: 'type', options: [
      {value:'翻唱', label: '翻唱'},
      {value:'原创', label: '原创'},
      {value:'串烧', label:'串烧'},
      {value: '本家重置', label: '本家重置'},
    ]},
  ];

  const bookmarked = isBookmarked(index);
  const bookmark = getBookmark(index);

  return (
    <Card 
      id={`record-${index}`}
      className={cn("w-full transition-all duration-300 hover:shadow-lg scroll-mt-24 relative", 
      record.status === 'auto' ? "bg-yellow-100/50 dark:bg-yellow-900/20" : 
      record.status === 'done' ? "bg-sky-100/50 dark:bg-sky-900/20" : ""
    )}>
      <CardContent className="p-4">
        {/* Bookmark Controls */}
        <div className="absolute top-2 right-2 z-10 flex gap-1">
           {bookmarked && (
              <Popover open={noteOpen} onOpenChange={setNoteOpen}>
                 <PopoverTrigger asChild>
                    <Button
                       variant="ghost"
                       size="icon"
                       className={cn("text-muted-foreground hover:text-primary", bookmark?.note ? "text-primary" : "")}
                       title={bookmark?.note ? "编辑备注" : "添加备注"}
                    >
                       <FileSignature className="h-5 w-5" />
                    </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-80">
                    <div className="grid gap-4">
                       <div className="space-y-2">
                          <h4 className="font-medium leading-none">书签备注</h4>
                          <p className="text-sm text-muted-foreground">
                             为这首歌添加备注信息
                          </p>
                       </div>
                       <div className="grid gap-2">
                          <Textarea 
                             id={`note-${index}`} 
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
           )}
           
           <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary"
              onClick={handleBookmarkClick}
              title={bookmarked ? "取消书签" : "添加书签"}
           >
              <Bookmark className={cn("h-5 w-5", bookmarked ? "fill-primary text-primary" : "")} />
           </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Left Column: Image & Control */}
          <div className="w-full md:w-1/3 flex flex-col gap-2">
            <div className="relative group">
               <a 
                 href={svmode ? `https://www.bilibili.com/video/av${record.aid}` : `https://www.bilibili.com/video/${record.bvid}`} 
                 target="_blank" 
                 rel="noreferrer"
                 className="block rounded-lg overflow-hidden border border-border shadow-sm hover:ring-2 ring-primary transition-all"
               >
                 <img src={record.image_url} alt={record.title} className="w-full object-cover aspect-video" referrerPolicy="no-referrer" />
               </a>
               
               {/* Video Preview Trigger */}
               <Dialog open={isPreviewOpen} onOpenChange={(open) => {
                  setIsPreviewOpen(open);
                  if (open) loadVideoPreview();
               }}>
                  <DialogTrigger asChild>
                     <Button 
                        size="icon" 
                        variant="secondary" 
                        className="absolute bottom-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        title="预览视频"
                     >
                        <PlayCircle className="h-5 w-5" />
                     </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                     <DialogHeader>
                        <DialogTitle>{record.title}</DialogTitle>
                     </DialogHeader>
                     <div className="aspect-video w-full bg-black flex items-center justify-center rounded-md overflow-hidden">
                        {previewLoading ? (
                           <div className="flex flex-col items-center text-white gap-2">
                              <Loader2 className="h-8 w-8 animate-spin" />
                              <span className="text-sm">正在解析视频地址...</span>
                           </div>
                        ) : videoUrl ? (
                           <video 
                              src={videoUrl} 
                              controls 
                              autoPlay 
                              className="w-full h-full"
                              // @ts-expect-error referrerPolicy is missing in React types but valid HTML
                              referrerPolicy="no-referrer"
                           >
                              您的浏览器不支持HTML5视频播放
                           </video>
                        ) : (
                           <div className="text-white text-sm">无法加载视频</div>
                        )}
                     </div>
                  </DialogContent>
               </Dialog>
            </div>
            
            <div className="flex items-center justify-between mt-2">
               <div className="flex items-center space-x-2">
                  <Switch 
                     id={`include-${index}`} 
                     checked={include} 
                     onCheckedChange={onIncludeChange} 
                  />
                  <Label htmlFor={`include-${index}`}>收录</Label>
               </div>
               {record.status === 'auto' && (
                  <Badge variant="outline" className="bg-yellow-200 text-yellow-800 border-yellow-300">AI打标</Badge>
               )}
            </div>
          </div>

          {/* Right Column: Fields */}
          <div className="w-full md:w-2/3 flex flex-col gap-3">
            <div className="font-bold text-lg leading-tight line-clamp-1 pr-16" title={record.title}>
               {record.title}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-2 text-sm">
               {fields.map((field) => (
                  <div key={field.prop} className="flex flex-col space-y-1">
                     <span className="text-muted-foreground text-xs">{field.label}</span>
                     
                     {field.type === 'string-hint' && (
                        <MarkingNameInput
                           value={record[field.prop]}
                           onChange={(val) => handleChange(field.prop, val)}
                           hasError={showFieldError(field.prop)}
                        />
                     )}

                     {(field.type === 'tags' || field.type === 'tags-hint') && (
                        <MarkingTags 
                           value={record[field.prop]} 
                           onChange={(val) => handleChange(field.prop, val)}
                           onInputChange={(val) => handleInputChange(field.prop, val)}
                           type={field.search || field.prop}
                           useHint={field.type === 'tags-hint'}
                           hasError={showFieldError(field.prop) || !!record[`_unconfirmed_${field.prop}`]}
                        />
                     )}

                     {field.type === 'select' && (
                        <Select 
                           value={String(record[field.prop])} 
                           onValueChange={(val) => {
                              const numVal = Number(val);
                              handleChange(field.prop, isNaN(numVal) ? val : numVal);
                           }}
                        >
                           <SelectTrigger className={cn("h-9", showFieldError(field.prop) && "border-destructive focus:ring-destructive")}>
                              <SelectValue placeholder="选择..." />
                           </SelectTrigger>
                           <SelectContent>
                              {field.options?.map(opt => (
                                 <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     )}
                  </div>
               ))}
            </div>

            <div className="flex gap-4 text-xs text-muted-foreground mt-2">
               <span>时长: {record.duration}</span>
               <span>分P: {record.page}</span>
               {record.tid && <span>分区: {record.tid}</span>}
            </div>
            
            <div className="bg-muted/50 p-2 rounded text-xs text-muted-foreground max-h-16 overflow-y-auto mt-auto">
               {record.intro}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
