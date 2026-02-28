export type SongType = "原创" | "翻唱" | "本家重置" | "串烧";
export type Copyright = 1 | 2 | 3 | 101 | 100;

export interface SongInfo {
  id: number;
  name: string;
  type: SongType;
  vocadb_id: number;
  display_name: string;
  producers?: { name: string; id: number }[];
  vocalists?: { name: string; id: number }[];
}

export interface VideoInfo {
  bvid: string;
  title: string;
  copyright: Copyright;
}
