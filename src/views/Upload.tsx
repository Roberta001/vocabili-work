import { useState, useCallback } from "react";
import api from "@/utils/api";
import {
  BoardIdentity,
  DataIdentity,
  isBoardIdentity,
  isDataIdentity,
} from "@/utils/filename";
import UploadFile from "@/components/UploadFile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "success" | "failed";

const BOARDS: Record<string, string> = {
  "vocaloid-daily": "日刊",
  "vocaloid-weekly": "周刊",
  "vocaloid-monthly": "月刊",
};

const PARTS: Record<string, string> = {
  main: "主榜",
  new: "新曲榜",
};

export default function Upload() {
  const [boardIdentity, setBoardIdentity] = useState<BoardIdentity | null>(
    null,
  );
  const [boardDialogOpen, setBoardDialogOpen] = useState(false);
  const [checkStatus, setCheckStatus] = useState<Status>("idle");
  const [checkError, setCheckError] = useState("");
  const [updateStatus, setUpdateStatus] = useState<Status>("idle");
  const [updateError, setUpdateError] = useState("");
  const [progress, setProgress] = useState("");

  const [dataIdentity, setDataIdentity] = useState<DataIdentity | null>(null);
  const [dataDialogOpen, setDataDialogOpen] = useState(false);
  const [dataStatus, setDataStatus] = useState<Status>("idle");
  const [dataError, setDataError] = useState("");

  const resetBoard = useCallback(() => {
    setCheckStatus("idle");
    setCheckError("");
    setUpdateStatus("idle");
    setUpdateError("");
    setProgress("");
  }, []);

  const handleUploadComplete = (identity: BoardIdentity | DataIdentity) => {
    if (isBoardIdentity(identity)) {
      setBoardIdentity(identity);
      resetBoard();
      setBoardDialogOpen(true);
    } else if (isDataIdentity(identity)) {
      setDataIdentity(identity);
      setDataStatus("idle");
      setDataError("");
      setDataDialogOpen(true);
      runDataProcess(identity);
    }
  };

  const runCheck = async () => {
    if (!boardIdentity) return;
    setCheckStatus("loading");
    setCheckError("");
    try {
      const res = await api.checkFile(
        boardIdentity.board,
        boardIdentity.part,
        boardIdentity.issue,
      );
      if (res.detail === "") {
        setCheckStatus("success");
      } else {
        setCheckStatus("failed");
        setCheckError(res.detail);
      }
    } catch (err: any) {
      setCheckStatus("failed");
      setCheckError(err?.response?.data?.message || err.message || "检查失败");
    }
  };

  const runUpdate = async () => {
    if (!boardIdentity) return;
    setUpdateStatus("loading");
    setUpdateError("");
    setProgress("");

    await new Promise<void>((resolve) => {
      api.updateRanking(
        boardIdentity.board,
        boardIdentity.part,
        boardIdentity.issue,
        false,
        {
          onProgress: setProgress,
          onComplete: () => {
            setUpdateStatus("success");
            resolve();
          },
          onError: (err: any) => {
            setUpdateStatus("failed");
            setUpdateError(err?.message || "更新失败");
            resolve();
          },
        },
      );
    });
  };

  const runDataProcess = async (identity: DataIdentity) => {
    setDataStatus("loading");
    setDataError("");
    try {
      await api.updateSnapshot(identity.date.toFormat("yyyy-MM-dd"));
      setDataStatus("success");
    } catch (err: any) {
      setDataStatus("failed");
      setDataError(err?.response?.data?.message || err.message || "处理失败");
    }
  };

  const closeBoardDialog = () => {
    setBoardDialogOpen(false);
    if (updateStatus === "success") {
      setBoardIdentity(null);
      resetBoard();
    }
  };

  const closeDataDialog = () => {
    setDataDialogOpen(false);
    if (dataStatus === "success") {
      setDataIdentity(null);
    }
  };

  return (
    <div className="flex flex-col items-center p-8 w-full max-w-xl mx-auto">
      <UploadFile onComplete={handleUploadComplete} />

      {/* 排名文件 */}
      <Dialog open={boardDialogOpen} onOpenChange={setBoardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>排名文件</DialogTitle>
          </DialogHeader>

          {boardIdentity && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded text-sm flex gap-4">
                <span>{BOARDS[boardIdentity.board]}</span>
                <span>{PARTS[boardIdentity.part]}</span>
                <span>第 {boardIdentity.issue} 期</span>
              </div>

              {/* 检查 */}
              <StepRow
                label="检查"
                status={checkStatus}
                error={checkError}
                onAction={runCheck}
                actionLabel="检查"
              />

              {/* 更新 */}
              <StepRow
                label="更新"
                status={updateStatus}
                error={updateError}
                onAction={runUpdate}
                actionLabel="更新"
                disabled={checkStatus !== "success"}
              />

              {updateStatus === "loading" && progress && (
                <div className="text-xs font-mono bg-muted p-2 rounded max-h-20 overflow-y-auto">
                  {progress}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={closeBoardDialog}>
              {updateStatus === "success" ? "完成" : "关闭"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 数据文件 */}
      <Dialog open={dataDialogOpen} onOpenChange={setDataDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>数据文件</DialogTitle>
          </DialogHeader>

          {dataIdentity && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded text-sm">
                {dataIdentity.date.toFormat("yyyy-MM-dd")}
              </div>

              <StepRow
                label="处理"
                status={dataStatus}
                error={dataError}
                onAction={() => runDataProcess(dataIdentity)}
                actionLabel="重试"
                showActionOnlyOnFail
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={closeDataDialog}
              disabled={dataStatus === "loading"}
            >
              {dataStatus === "success" ? "完成" : "关闭"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 步骤行组件
function StepRow({
  label,
  status,
  error,
  onAction,
  actionLabel,
  disabled,
  showActionOnlyOnFail,
}: {
  label: string;
  status: Status;
  error?: string;
  onAction: () => void;
  actionLabel: string;
  disabled?: boolean;
  showActionOnlyOnFail?: boolean;
}) {
  return (
    <div
      className={cn("space-y-1", disabled && "opacity-50 pointer-events-none")}
    >
      <div
        className={cn(
          "flex items-center justify-between p-3 rounded border",
          status === "success" &&
            "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20",
          status === "failed" &&
            "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20",
        )}
      >
        <div className="flex items-center gap-2">
          {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === "success" && (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          {status === "failed" && <XCircle className="h-4 w-4 text-red-600" />}
          <span>{label}</span>
        </div>

        {status === "idle" && !showActionOnlyOnFail && (
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {status === "loading" && (
          <span className="text-sm text-muted-foreground">处理中...</span>
        )}
        {status === "failed" && (
          <Button size="sm" variant="outline" onClick={onAction}>
            <RotateCcw className="h-3 w-3 mr-1" />
            重试
          </Button>
        )}
        {status === "success" && (
          <span className="text-sm text-green-600">完成</span>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded whitespace-pre-wrap">
          {error}
        </div>
      )}
    </div>
  );
}
