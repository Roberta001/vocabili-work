import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const navs = [
  { name: "上传", path: "/" },
  { name: "打标", path: "/mark" },
  { name: "编辑", path: "/edit" },
];

export default function Header() {
  const location = useLocation();
  const [apiKey, setApiKey] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setApiKey(localStorage.getItem("x-api-key") || "");
    }
  };

  const handleSave = () => {
    localStorage.setItem("x-api-key", apiKey);
    setIsOpen(false);
  };

  return (
    <header className="h-10 w-full flex items-stretch border-b bg-background">
      {navs.map((nav) => (
        <Link
          key={nav.path}
          to={nav.path}
          className={cn(
            "flex-1 flex items-center justify-center hover:bg-muted/50 transition-colors",
            location.pathname === nav.path ? "bg-muted font-medium" : "",
          )}
        >
          <span className="text-sm">{nav.name}</span>
        </Link>
      ))}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <button className="w-10 flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" />
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="api-key" className="text-right">
                API Key
              </Label>
              <Input
                id="api-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="col-span-3"
                placeholder="x-api-key"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
