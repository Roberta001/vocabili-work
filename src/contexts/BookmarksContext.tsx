import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { toast } from "sonner";

// Define the bookmark type (storing index as the primary key for navigation)
export interface Bookmark {
  index: number;
  title: string;
  timestamp: number;
  note?: string;
}

interface BookmarksContextType {
  bookmarks: Bookmark[];
  addBookmark: (index: number, title: string, note?: string) => void;
  addBookmarksBatch: (
    bookmarksToAdd: { index: number; title: string; note?: string }[],
  ) => void;
  removeBookmark: (index: number) => void;
  toggleBookmark: (index: number, title: string, note?: string) => void;
  updateBookmarkNote: (index: number, note: string) => void;
  isBookmarked: (index: number) => boolean;
  getBookmark: (index: number) => Bookmark | undefined;
  clearBookmarks: () => void;
  importBookmarks: (file: File) => void;
  exportBookmarks: () => void;
}

const BookmarksContext = createContext<BookmarksContextType | undefined>(
  undefined,
);

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    // Load from local storage on initial render
    const saved = localStorage.getItem("marking_bookmarks");
    return saved ? JSON.parse(saved) : [];
  });

  // Save to local storage whenever bookmarks change
  useEffect(() => {
    localStorage.setItem("marking_bookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

  const addBookmark = (index: number, title: string, note?: string) => {
    setBookmarks((prev) => {
      if (prev.some((b) => b.index === index)) return prev;
      const newBookmarks = [
        ...prev,
        { index, title, timestamp: Date.now(), note },
      ];
      return newBookmarks.sort((a, b) => a.index - b.index);
    });
    toast.success("已添加书签");
  };

  const addBookmarksBatch = (
    bookmarksToAdd: { index: number; title: string; note?: string }[],
  ) => {
    setBookmarks((prev) => {
      let changed = false;
      const prevMap = new Map(prev.map((b) => [b.index, b]));

      bookmarksToAdd.forEach((b) => {
        if (!prevMap.has(b.index)) {
          prevMap.set(b.index, {
            index: b.index,
            title: b.title,
            timestamp: Date.now(),
            note: b.note,
          });
          changed = true;
        }
      });

      if (!changed) return prev;
      return Array.from(prevMap.values()).sort((a, b) => a.index - b.index);
    });
    toast.success(`批量添加了书签`);
  };

  const removeBookmark = (index: number) => {
    setBookmarks((prev) => prev.filter((b) => b.index !== index));
    toast.success("已移除书签");
  };

  const toggleBookmark = (index: number, title: string, note?: string) => {
    if (isBookmarked(index)) {
      removeBookmark(index);
    } else {
      addBookmark(index, title, note);
    }
  };

  const updateBookmarkNote = (index: number, note: string) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.index === index ? { ...b, note } : b)),
    );
  };

  const isBookmarked = (index: number) => {
    return bookmarks.some((b) => b.index === index);
  };

  const getBookmark = (index: number) => {
    return bookmarks.find((b) => b.index === index);
  };

  const clearBookmarks = () => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm("确定要清空所有书签吗？")) {
      setBookmarks([]);
      toast.success("已清空书签");
    }
  };

  const exportBookmarks = () => {
    const dataStr = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bookmarks_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("书签已导出");
  };

  const importBookmarks = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const imported = JSON.parse(result);
        if (Array.isArray(imported)) {
          // Simple validation
          const valid = imported.every(
            (item: any) =>
              typeof item.index === "number" && typeof item.title === "string",
          );
          if (valid) {
            setBookmarks(imported);
            toast.success(`成功导入 ${imported.length} 个书签`);
          } else {
            toast.error("书签文件格式不正确");
          }
        } else {
          toast.error("无效的JSON格式");
        }
      } catch (error) {
        console.error(error);
        toast.error("导入失败：无法解析文件");
      }
    };
    reader.readAsText(file);
  };

  return (
    <BookmarksContext.Provider
      value={{
        bookmarks,
        addBookmark,
        addBookmarksBatch,
        removeBookmark,
        toggleBookmark,
        updateBookmarkNote,
        isBookmarked,
        getBookmark,
        clearBookmarks,
        importBookmarks,
        exportBookmarks,
      }}
    >
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks() {
  const context = useContext(BookmarksContext);
  if (context === undefined) {
    throw new Error("useBookmarks must be used within a BookmarksProvider");
  }
  return context;
}
