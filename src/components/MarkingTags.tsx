import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { X } from "lucide-react";
import api from "@/utils/api";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

interface MarkingTagsProps {
  value: string; // Comma separated string "tag1、tag2"
  onChange: (value: string) => void;
  onInputChange?: (value: string) => void;
  type: string;
  useHint: boolean;
  hasError?: boolean;
}

export default function MarkingTags({ value, onChange, onInputChange, type, useHint, hasError }: MarkingTagsProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debouncedInput = useDebounce(inputValue, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (val: string) => {
    setInputValue(val);
    if (onInputChange) {
      onInputChange(val);
    }
  };

  const tags = value ? value.split("、").filter(Boolean) : [];

  const svMap: Record<string, string> = {
    '1': 'SV榜',
    '2': '国产榜',
    '3': 'UTAU榜',
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (debouncedInput && useHint) {
      api.search(type, debouncedInput).then((res) => {
        if (res.data) {
           setSuggestions(res.data.map((item: any) => item.name));
        } else {
           setSuggestions([]);
        }
      }).catch(console.error);
    } else {
      setSuggestions([]);
    }
  }, [debouncedInput, type, useHint]);

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      const newTags = [...tags, tag];
      onChange(newTags.join("、"));
    }
    handleInputChange("");
    setOpen(false);
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    onChange(newTags.join("、"));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  if (!useHint) {
    return (
       <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] items-center bg-muted/20">
          {tags.length > 0 ? tags.map((tag) => (
             <Badge key={tag} variant="secondary">
                {svMap[tag] || tag}
             </Badge>
          )) : <span className="text-muted-foreground text-xs px-1">无标签</span>}
       </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 w-full relative" ref={wrapperRef}>
      <div className={cn(
        "flex flex-wrap items-center gap-1.5 p-2 rounded-md border bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        "min-h-[42px]",
        hasError && "border-destructive focus-within:ring-destructive"
      )}>
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="pr-1 h-6">
            {tag}
            <button
              className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          </Badge>
        ))}
        
        <input
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[120px] text-sm h-6"
          placeholder={tags.length === 0 ? "输入标签..." : ""}
          value={inputValue}
          onChange={(e) => {
            handleInputChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {open && (suggestions.length > 0 || inputValue) && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 overflow-hidden">
           <Command className="w-full">
              <CommandList className="max-h-[200px] overflow-y-auto p-1">
                 {suggestions.length > 0 && (
                    <CommandGroup heading="建议">
                       {suggestions.map((suggestion) => (
                          <CommandItem
                             key={suggestion}
                             value={suggestion}
                             onSelect={() => addTag(suggestion)}
                             className="cursor-pointer"
                          >
                             {suggestion}
                          </CommandItem>
                       ))}
                    </CommandGroup>
                 )}
                 {inputValue && !suggestions.includes(inputValue) && (
                   <CommandGroup heading="操作">
                     <CommandItem 
                        value={inputValue} 
                        onSelect={() => addTag(inputValue)}
                        className="cursor-pointer"
                     >
                       添加 "{inputValue}"
                     </CommandItem>
                   </CommandGroup>
                 )}
              </CommandList>
           </Command>
        </div>
      )}
    </div>
  );
}
