import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import api from "@/utils/api";
import { useDebounce } from "@/hooks/use-debounce";
import type { SongInfo } from "@/utils/types";
import { cn } from "@/lib/utils";

interface MarkingNameInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  hasError?: boolean;
}

export default function MarkingNameInput({
  value,
  onChange,
  className,
  hasError,
}: MarkingNameInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [suggestions, setSuggestions] = useState<SongInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedInput = useDebounce(inputValue, 500);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal state with prop
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Only search if input is long enough and user is typing (open is true usually means focus)
    if (debouncedInput && debouncedInput.length >= 1 && open) {
      setLoading(true);
      api
        .search("song", debouncedInput)
        .then((res: any) => {
          if (res.data && Array.isArray(res.data)) {
            setSuggestions(res.data);
          } else {
            setSuggestions([]);
          }
        })
        .catch((err: any) => {
          console.error("Search song failed", err);
          setSuggestions([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setSuggestions([]);
    }
  }, [debouncedInput, open]);

  const handleSelect = (song: SongInfo) => {
    const newValue = song.display_name || song.name;
    setInputValue(newValue);
    onChange(newValue);
    setOpen(false);
  };

  const exactMatch = suggestions.find(
    (s) => s.name === inputValue || s.display_name === inputValue,
  );

  return (
    <div
      className={cn("flex gap-2 relative w-full", className)}
      ref={wrapperRef}
    >
      <div className="relative w-full">
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
          }}
          onBlur={() => {
            if (inputValue !== value) {
              onChange(inputValue);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onChange(inputValue);
              setOpen(false);
            }
          }}
          onFocus={() => setOpen(true)}
          className={cn(
            "h-9 w-full",
            hasError && "border-destructive focus-visible:ring-destructive",
          )}
          placeholder="输入歌曲名称..."
        />

        {open && (suggestions.length > 0 || loading) && (
          <div className="absolute top-full left-0 z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto p-1 bg-background">
              {loading && (
                <div className="flex items-center justify-center p-4 text-sm text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>搜索中...</span>
                </div>
              )}

              {!loading && suggestions.length > 0 && (
                <div className="py-1">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    搜索结果
                  </div>
                  {suggestions.map((song) => (
                    <div
                      key={song.id}
                      onClick={() => handleSelect(song)}
                      className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-2 py-2 rounded-sm text-sm flex flex-col items-start gap-0.5"
                    >
                      <div className="font-medium">
                        {song.display_name || song.name}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="bg-muted px-1 rounded">
                          {song.type}
                        </span>
                        {song.producers && song.producers.length > 0 && (
                          <span>
                            P主:{" "}
                            {song.producers.map((p: any) => p.name).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && suggestions.length === 0 && inputValue && (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  未找到相关歌曲
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {exactMatch && (
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0"
          asChild
        >
          <a
            href={`https://vocabili.top/song/${exactMatch.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      )}
    </div>
  );
}
