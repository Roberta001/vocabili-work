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
import type { SongInfo, SongType } from "@/utils/types";

const songTypes: SongType[] = ["原创", "翻唱", "本家重置", "串烧"];

export default function EditSong() {
  const [searchId, setSearchId] = useState<number | "">("");
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [songInfo, setSongInfo] = useState<SongInfo | null>(null);
  const [originalSong, setOriginalSong] = useState<SongInfo | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);

  const hasChanges = useMemo(() => {
    if (!songInfo || !originalSong) return false;
    return JSON.stringify(songInfo) !== JSON.stringify(originalSong);
  }, [songInfo, originalSong]);

  const handleSearch = async () => {
    if (!searchId) {
      toast.warning("请输入歌曲ID");
      return;
    }

    try {
      setSearching(true);
      const result = await api.selectSong(Number(searchId));
      setSongInfo({ ...result.data });
      setOriginalSong({ ...result.data });
      toast.success("歌曲信息获取成功");
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message || error.message || "获取歌曲信息失败";
      toast.error(errorMsg);
      setSongInfo(null);
      setOriginalSong(null);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = () => {
    if (!songInfo) {
      toast.warning("没有可提交的歌曲信息");
      return;
    }

    if (!songInfo.name.trim()) {
      toast.warning("请输入歌曲名称");
      return;
    }

    if (!songInfo.type) {
      toast.warning("请选择歌曲类型");
      return;
    }

    if (!hasChanges) {
      toast.warning("没有检测到任何变化");
      return;
    }

    setDialogVisible(true);
  };

  const confirmEdit = async () => {
    if (!songInfo) {
      toast.error("歌曲信息不存在");
      return;
    }

    try {
      setSubmitting(true);
      await api.editSong(songInfo);
      toast.success("歌曲信息更新成功");
      setDialogVisible(false);

      if (songInfo.id) {
        // Refresh data
        const result = await api.selectSong(songInfo.id);
        setSongInfo({ ...result.data });
        setOriginalSong({ ...result.data });
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.detail || error.message || "更新歌曲信息失败";
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
            编辑歌曲信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Area */}
          <div className="mb-6">
            <Label className="mb-2 block">歌曲ID：</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="请输入歌曲ID"
                value={searchId}
                onChange={(e) =>
                  setSearchId(e.target.value ? parseInt(e.target.value) : "")
                }
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={searching || !searchId}>
                {searching ? "搜索中..." : "搜索"}
              </Button>
            </div>
          </div>

          {/* Edit Area */}
          {songInfo && (
            <div className="space-y-5">
              <div>
                <Label className="mb-2 block">ID：</Label>
                <Input value={songInfo.id} disabled />
              </div>

              <div>
                <Label className="mb-2 block">歌曲名称：</Label>
                <Input
                  value={songInfo.name}
                  placeholder="请输入歌曲名称"
                  onChange={(e) =>
                    setSongInfo({ ...songInfo, name: e.target.value })
                  }
                />
              </div>

              <div>
                <Label className="mb-2 block">类型：</Label>
                <Select
                  value={songInfo.type}
                  onValueChange={(val: SongType) =>
                    setSongInfo({ ...songInfo, type: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择歌曲类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {songTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">VocaDB ID：</Label>
                <Input
                  type="number"
                  value={songInfo.vocadb_id || ""}
                  placeholder="请输入VocaDB ID"
                  onChange={(e) =>
                    setSongInfo({
                      ...songInfo,
                      vocadb_id: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <Label className="mb-2 block">显示名称：</Label>
                <Input
                  value={songInfo.display_name || ""}
                  placeholder="请输入显示名称"
                  onChange={(e) =>
                    setSongInfo({ ...songInfo, display_name: e.target.value })
                  }
                />
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
            <DialogTitle>确认更新歌曲信息</DialogTitle>
          </DialogHeader>
          <div className="py-5 space-y-4">
            <div className="flex items-center">
              <span className="w-24 font-medium">歌曲ID：</span>
              <span className="text-gray-600">{originalSong?.id}</span>
            </div>

            {songInfo?.name !== originalSong?.name && (
              <div className="flex items-center">
                <span className="w-24 font-medium">歌曲名称：</span>
                <span className="text-gray-500 line-through mr-2">
                  {originalSong?.name}
                </span>
                <span className="mr-2">→</span>
                <span className="text-blue-500 font-medium">
                  {songInfo?.name}
                </span>
              </div>
            )}

            {songInfo?.type !== originalSong?.type && (
              <div className="flex items-center">
                <span className="w-24 font-medium">类型：</span>
                <span className="text-gray-500 line-through mr-2">
                  {originalSong?.type}
                </span>
                <span className="mr-2">→</span>
                <span className="text-blue-500 font-medium">
                  {songInfo?.type}
                </span>
              </div>
            )}

            {songInfo?.vocadb_id !== originalSong?.vocadb_id && (
              <div className="flex items-center">
                <span className="w-24 font-medium">VocaDB ID：</span>
                <span className="text-gray-500 line-through mr-2">
                  {originalSong?.vocadb_id || "空"}
                </span>
                <span className="mr-2">→</span>
                <span className="text-blue-500 font-medium">
                  {songInfo?.vocadb_id || "空"}
                </span>
              </div>
            )}

            {songInfo?.display_name !== originalSong?.display_name && (
              <div className="flex items-center">
                <span className="w-24 font-medium">显示名称：</span>
                <span className="text-gray-500 line-through mr-2">
                  {originalSong?.display_name || "空"}
                </span>
                <span className="mr-2">→</span>
                <span className="text-blue-500 font-medium">
                  {songInfo?.display_name || "空"}
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
