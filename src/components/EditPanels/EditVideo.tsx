import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import api from "@/utils/api";
import type { VideoInfo, Copyright } from "@/utils/types";

const copyrightOptions = [
  { label: "自制", value: 1 },
  { label: "转载", value: 2 },
  { label: "薛定谔态", value: 3 },
  { label: "转载投自制", value: 101 },
  { label: "自制投转载", value: 100 },
];

export default function EditVideo() {
  const [searchBvid, setSearchBvid] = useState("");
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [originalVideo, setOriginalVideo] = useState<VideoInfo | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);

  const hasChanges = useMemo(() => {
    if (!videoInfo || !originalVideo) return false;
    return JSON.stringify(videoInfo) !== JSON.stringify(originalVideo);
  }, [videoInfo, originalVideo]);

  const getCopyrightLabel = (copyright?: Copyright) => {
    const option = copyrightOptions.find((opt) => opt.value === copyright);
    return option?.label || "未知";
  };

  const handleSearch = async () => {
    if (!searchBvid.trim()) {
      toast.warning("请输入视频BV号");
      return;
    }

    try {
      setSearching(true);
      const result = await api.selectVideo(searchBvid);
      setVideoInfo({ ...result.data });
      setOriginalVideo({ ...result.data });
      toast.success("视频信息获取成功");
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message || error.message || "获取视频信息失败";
      toast.error(errorMsg);
      setVideoInfo(null);
      setOriginalVideo(null);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = () => {
    if (!videoInfo) {
      toast.warning("没有可提交的视频信息");
      return;
    }

    if (!videoInfo.title.trim()) {
      toast.warning("请输入视频标题");
      return;
    }

    if (!videoInfo.copyright) {
      toast.warning("请选择版权类型");
      return;
    }

    if (!hasChanges) {
      toast.warning("没有检测到任何变化");
      return;
    }

    setDialogVisible(true);
  };

  const confirmEdit = async () => {
    if (!videoInfo) {
      toast.error("视频信息不存在");
      return;
    }

    try {
      setSubmitting(true);
      await api.editVideo(videoInfo);
      toast.success("视频信息更新成功");
      setDialogVisible(false);

      if (videoInfo.bvid) {
        const result = await api.selectVideo(videoInfo.bvid);
        setVideoInfo({ ...result.data });
        setOriginalVideo({ ...result.data });
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.detail || error.message || "更新视频信息失败";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-center">
            编辑视频信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Area */}
          <div className="mb-6">
            <Label className="mb-2 block">视频BV号：</Label>
            <div className="flex gap-2">
              <Input
                placeholder="请输入视频BV号"
                value={searchBvid}
                onChange={(e) => setSearchBvid(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSearch}
                disabled={searching || !searchBvid.trim()}
              >
                {searching ? "搜索中..." : "搜索"}
              </Button>
            </div>
          </div>

          {/* Edit Area */}
          {videoInfo && (
            <div className="space-y-5">
              <div>
                <Label className="mb-2 block">BV号：</Label>
                <Input value={videoInfo.bvid} disabled />
              </div>

              <div>
                <Label className="mb-2 block">视频标题：</Label>
                <Input
                  value={videoInfo.title}
                  placeholder="请输入视频标题"
                  onChange={(e) =>
                    setVideoInfo({ ...videoInfo, title: e.target.value })
                  }
                />
              </div>

              <div>
                <Label className="mb-2 block">版权类型：</Label>
                <Select
                  value={String(videoInfo.copyright)}
                  onValueChange={(val) =>
                    setVideoInfo({
                      ...videoInfo,
                      copyright: parseInt(val) as Copyright,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择版权类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {copyrightOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={String(option.value)}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={submitting}
              >
                提交更新
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogVisible} onOpenChange={setDialogVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认更新视频信息</DialogTitle>
          </DialogHeader>
          <div className="py-5 space-y-4">
            <div className="flex items-center">
              <span className="w-24 font-medium">BV号：</span>
              <span className="text-gray-600">{originalVideo?.bvid}</span>
            </div>

            {videoInfo?.title !== originalVideo?.title && (
              <div className="flex items-center">
                <span className="w-24 font-medium">视频标题：</span>
                <span className="text-gray-500 line-through mr-2">
                  {originalVideo?.title}
                </span>
                <span className="mr-2">→</span>
                <span className="text-blue-500 font-medium">
                  {videoInfo?.title}
                </span>
              </div>
            )}

            {videoInfo?.copyright !== originalVideo?.copyright && (
              <div className="flex items-center">
                <span className="w-24 font-medium">版权类型：</span>
                <span className="text-gray-500 line-through mr-2">
                  {getCopyrightLabel(originalVideo?.copyright)}
                </span>
                <span className="mr-2">→</span>
                <span className="text-blue-500 font-medium">
                  {getCopyrightLabel(videoInfo?.copyright)}
                </span>
              </div>
            )}

            {!hasChanges && (
              <div className="flex items-center text-gray-500">
                没有检测到任何变化
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogVisible(false)}>
              取消
            </Button>
            <Button onClick={confirmEdit} disabled={submitting}>
              {submitting ? "更新中..." : "确认更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
