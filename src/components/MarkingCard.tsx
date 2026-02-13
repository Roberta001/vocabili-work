import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExternalLink, PlayCircle, Loader2 } from 'lucide-react';
import MarkingTags from './MarkingTags';
import api from '@/utils/api';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import axios from 'axios';
import { toast } from 'sonner';

interface MarkingCardProps {
  record: any;
  include: boolean;
  onIncludeChange: (value: boolean) => void;
  index: number;
  svmode: boolean;
  onUpdate: (record: any) => void;
}

export default function MarkingCard({ record, include, onIncludeChange, index, svmode, onUpdate }: MarkingCardProps) {
  const [song, setSong] = useState<any>(null);
  const [nameInput, setNameInput] = useState(record.name || '');
  const debouncedName = useDebounce(nameInput, 500);

  // Video preview states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!svmode && debouncedName) {
       api.search('song', debouncedName).then(res => {
          if (res.data) {
             const exact = res.data.find((item: any) => item.name === debouncedName);
             if (exact) setSong(exact);
          }
       }).catch(() => {});
    }
  }, [debouncedName, svmode]);
  
  useEffect(() => {
     setNameInput(record.name || '');
  }, [record.name]);

  const handleChange = (field: string, value: any) => {
    const newRecord = { ...record, [field]: value };
    onUpdate(newRecord);
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

  return (
    <Card className={cn("w-full transition-all duration-300 hover:shadow-lg", 
      record.status === 'auto' ? "bg-yellow-100/50 dark:bg-yellow-900/20" : 
      record.status === 'done' ? "bg-sky-100/50 dark:bg-sky-900/20" : ""
    )}>
      <CardContent className="p-4">
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
                  else {
                     // Optionally clear video URL to stop playing when closed, 
                     // or keep it to resume. Usually better to clear or pause.
                     // But <video> inside Dialog unmounts so it stops naturally?
                     // DialogContent unmounts its children when closed, so yes.
                  }
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
            <div className="font-bold text-lg leading-tight line-clamp-1" title={record.title}>
               {record.title}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-2 text-sm">
               {fields.map((field) => (
                  <div key={field.prop} className="flex flex-col space-y-1">
                     <span className="text-muted-foreground text-xs">{field.label}</span>
                     
                     {field.type === 'string-hint' && (
                        <div className="flex gap-2">
                           <div className="relative w-full">
                              <Input 
                                 value={nameInput} 
                                 onChange={(e) => {
                                    setNameInput(e.target.value);
                                    handleChange('name', e.target.value);
                                 }}
                                 className="h-9"
                              />
                           </div>
                           {song && (
                              <Button size="icon" variant="ghost" className="h-9 w-9" asChild>
                                 <a href={`https://vocabili.top/song/${song.id}`} target="_blank">
                                    <ExternalLink className="h-4 w-4" />
                                 </a>
                              </Button>
                           )}
                        </div>
                     )}

                     {(field.type === 'tags' || field.type === 'tags-hint') && (
                        <MarkingTags 
                           value={record[field.prop]} 
                           onChange={(val) => handleChange(field.prop, val)}
                           type={field.search || field.prop}
                           useHint={field.type === 'tags-hint'}
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
                           <SelectTrigger className="h-9">
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
