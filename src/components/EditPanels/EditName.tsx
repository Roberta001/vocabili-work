import { useState } from "react";
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

interface Artist {
  id: number;
  name: string;
}

interface EditData {
  task_id: string;
  old_artist: Artist;
  new_artist: Artist;
}

const artistTypes = [
  { label: "歌手", value: "vocalist" },
  { label: "作者", value: "producer" },
  { label: "UP主", value: "uploader" },
  { label: "引擎", value: "synthesizer" },
];

export default function EditName() {
  const [editForm, setEditForm] = useState({
    type: "producer",
    id: 0,
    name: "",
  });
  const [oldName, setOldName] = useState<string>("");
  const [dialogVisible, setDialogVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editData, setEditData] = useState<EditData | null>(null);

  const handleSelectOldName = async () => {
    if (!editForm.type || !editForm.id) return;

    try {
      setConfirming(true);
      const result = await api.selectArtist(editForm.type, editForm.id);
      if (result) {
        setOldName(result.name);
      }
    } catch (error) {
      // Quiet fail or log
      console.error(error);
    } finally {
      setConfirming(false);
    }
  };

  const handleSubmit = async () => {
    if (!editForm.type || !editForm.id || !editForm.name) {
      toast.warning("请填写完整信息");
      return;
    }

    try {
      setConfirming(true);
      // The API call seems to be what was "editArtistCheck" in the Vue code
      // Looking at api.ts: editArtistCheck(type, id, name)
      // Wait, the Vue code calls api.editArtistCheck(type, id, name) inside showEditDialog
      // But api.ts in new repo has editArtistCheck.
      // Let's verify the API method name in new repo's api.ts.
      // It has `async editArtistCheck(type: string, id: number, name: string)`
      // But the endpoint is POST /edit/artist/check

      // Note: api.editArtistCheck in new/src/utils/api.ts takes object {type, id, name}?
      // Let me re-read api.ts content from previous step.
      // Line 105: async editArtistCheck(type: string, id: number, name: string) { ... }
      // It posts { type, id, name }

      const result = await api.editArtistCheck(
        editForm.type,
        editForm.id,
        editForm.name,
      );

      if (result.task_id && result.old_artist) {
        setEditData(result);
        setDialogVisible(true);
      } else {
        toast.error("返回数据格式错误");
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message || error.message || "检查编辑请求失败";
      toast.error(errorMsg);
    } finally {
      setConfirming(false);
    }
  };

  const confirmEdit = async () => {
    if (!editData?.task_id) {
      toast.error("任务ID不存在");
      return;
    }

    try {
      setConfirming(true);
      await api.editArtistConfirm(editData.task_id);
      toast.success("编辑确认成功");
      setDialogVisible(false);
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message || error.message || "确认编辑失败";
      toast.error(errorMsg);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-center">
            编辑艺术家信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="mb-2 block">类型：</Label>
            <Select
              value={editForm.type}
              onValueChange={(val) => setEditForm({ ...editForm, type: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择类型" />
              </SelectTrigger>
              <SelectContent>
                {artistTypes.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">ID：</Label>
            <Input
              type="number"
              placeholder="请输入ID"
              value={editForm.id || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, id: parseInt(e.target.value) || 0 })
              }
              onBlur={handleSelectOldName}
            />
            {oldName && (
              <div className="mt-1 text-sm text-muted-foreground">
                当前名称: {oldName}
              </div>
            )}
          </div>

          <div>
            <Label className="mb-2 block">新名称：</Label>
            <Input
              placeholder="请输入新的艺术家名称"
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={confirming}
          >
            {confirming ? "提交中..." : "提交编辑请求"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogVisible} onOpenChange={setDialogVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认编辑艺术家信息</DialogTitle>
          </DialogHeader>
          <div className="py-5 space-y-4">
            {editData?.new_artist ? (
              <>
                <div className="flex items-center">
                  <span className="w-24 font-medium">原有实体：</span>
                  <span className="text-gray-500 line-through">
                    {editData.old_artist.name}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="w-24 font-medium">合并目标：</span>
                  <span className="text-blue-500 font-medium">
                    {editData.new_artist.name}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center">
                  <span className="w-24 font-medium">原名：</span>
                  <span className="text-gray-500 line-through">
                    {editData?.old_artist.name}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="w-24 font-medium">修改名称：</span>
                  <span className="text-blue-500 font-medium">
                    {editForm.name}
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center">
              <span className="w-24 font-medium">任务ID：</span>
              <span className="text-green-600 font-mono bg-green-50 px-2 py-1 rounded text-sm">
                {editData?.task_id}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogVisible(false)}>
              取消
            </Button>
            <Button onClick={confirmEdit} disabled={confirming}>
              {confirming ? "处理中..." : "确认编辑"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
