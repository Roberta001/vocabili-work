import { useState, useRef } from "react";
import api from "@/utils/api";
import { extractFileName, BoardIdentity, DataIdentity } from "@/utils/filename";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, AlertCircle, RotateCcw, X } from "lucide-react";

interface UploadFileProps {
  onComplete: (identity: BoardIdentity | DataIdentity) => void;
}

export default function UploadFile({ onComplete }: UploadFileProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setProgress(0);
    setSuccess(false);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;

    setFile(f);
    setProgress(0);
    setSuccess(false);
    setError("");

    await upload(f);
  };

  const upload = async (f: File) => {
    try {
      setUploading(true);
      setError("");
      const identity = extractFileName(f.name);

      await api.uploadFile(f, {
        onProgress: (p) => setProgress(p * 100),
      });

      setSuccess(true);
      onComplete(identity);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.detail ??
          err?.response?.data?.message ??
          err?.message ??
          "上传失败",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = () => {
    if (file) {
      upload(file);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6 space-y-4">
        {!file ? (
          <Input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="cursor-pointer"
          />
        ) : (
          <div className="space-y-3">
            {/* 文件信息 */}
            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <div className="flex items-center gap-2 text-sm truncate">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{file.name}</span>
              </div>
              {!uploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* 上传中 */}
            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>上传中...</span>
                  <span>{Math.floor(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* 成功 */}
            {success && (
              <div className="flex items-center gap-2 p-3 rounded bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">上传成功</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="ml-auto"
                >
                  上传新文件
                </Button>
              </div>
            )}

            {/* 失败 */}
            {error && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-3 rounded bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRetry}>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    重试
                  </Button>
                  <Button variant="ghost" size="sm" onClick={reset}>
                    换文件
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
