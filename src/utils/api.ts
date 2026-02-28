import axios from "axios";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import type { SongInfo, VideoInfo } from "@/utils/types";

const BASE_URL = "https://api.vocabili.top/v2"

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem("x-api-key");
  if (apiKey) {
    config.headers["x-api-key"] = apiKey;
  }
  return config;
});

class Requester {
  static endpoint = {
    uploadFile: "/upload",
    checkFile: "/update/check_ranking",
    updateRanking: "/update/ranking",
    updateSnapshot: "/update/snapshots",
    editArtistCheck: "/edit/artist/check",
    editArtistConfirm: "/edit/artist/confirm",
    editSong: "/edit/song",
    editVideo: "/edit/video",
    search: (type: string) => `/search/${type}`,
    selectArtist: `/select/artist`,
    selectSong: `/select/song`,
    selectVideo: `/select/video`,
  }

  constructor() {}

  async uploadFile(
    file: File,
    handlers?: {
      onProgress?: (progress: number) => void;
    }) {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(Requester.endpoint.uploadFile, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (evt) => {
        if (evt.total && evt.loaded) {
          const progress = evt.loaded / evt.total;
          handlers?.onProgress?.(progress);
        }
      },
      timeout: 100000
    });
  }

  async checkFile(board: string, part: string, issue: number) {
    const res = await api.get(Requester.endpoint.checkFile, {
      params: { board, part, issue },
    });
    return res.data;
  }

  updateRanking(
    board: string,
    part: string,
    issue: number,
    old?: boolean,
    handlers?: {
      onStart?: () => void;
      onProgress?: (data: string) => void;
      onComplete?: (data?: string) => void;
      onError?: (err: unknown) => void;
    }
  ) {
    const url = `${BASE_URL}${Requester.endpoint.updateRanking}?board=${board}&part=${part}&issue=${issue}${old ? '&old=true' : ''}`;
    const apiKey = localStorage.getItem("x-api-key") || "";

    if (handlers?.onStart) {
        handlers.onStart();
    }

    const abortController = new AbortController();

    fetchEventSource(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
      signal: abortController.signal,
      onmessage(ev) {
        if (ev.event === "progress") {
          handlers?.onProgress?.(ev.data);
        } else if (ev.event === "complete") {
          handlers?.onComplete?.(ev.data);
          abortController.abort();
        } else {
          // fallback if event type is default
          if (ev.data === "complete") {
            handlers?.onComplete?.(ev.data);
            abortController.abort();
          } else if (ev.data.includes("progress")) {
            handlers?.onProgress?.(ev.data);
          }
        }
      },
      onerror(err) {
        handlers?.onError?.(err);
        abortController.abort();
        throw err; // prevent default retry
      }
    }).catch((err) => {
      // Catch any unexpected errors outside the event source loop (e.g. network failure before starting)
      if (err.name !== 'AbortError') {
        handlers?.onError?.(err);
      }
    });

    return () => abortController.abort(); 
  }


  async updateSnapshot(date: string, old?: boolean) {
    const res = await api.get(Requester.endpoint.updateSnapshot, {
      params: { date, old },
      timeout: 100000, 
    });
    return res.data;
  }


  async editArtistCheck(type: string, id: number, name: string) {
    const res = await api.post(Requester.endpoint.editArtistCheck, { type, id, name });
    return res.data
  }

  async editArtistConfirm(task_id: string) {
    return api.post(Requester.endpoint.editArtistConfirm, { task_id });
  }

  async search(type: string, keyword: string, page = 1, pageSize = 20): Promise<any> {
    const res =  await api.get(Requester.endpoint.search(type), {
      params: { keyword, page, page_size: pageSize }
    })
    return res.data
  }

  async selectArtist(type: string, id: number) {
    const res = await api.get(Requester.endpoint.selectArtist, {
      params: { type, id }
    });
    return res.data
  }

  async selectSong(id: number): Promise<{data: SongInfo}> {
    const res = await api.get(Requester.endpoint.selectSong, {
      params: { id }
    });
    return res.data
  }

  async editSong(song: SongInfo) {
    // Some APIs expect ID in URL or query, others in body. Assuming body based on usage.
    const res = await api.post(Requester.endpoint.editSong, song);
    return res.data
  }

  async selectVideo(bvid: string): Promise<{data: VideoInfo}> {
    const res = await api.get(Requester.endpoint.selectVideo, {
      params: { bvid }
    });
    return res.data
  }

  async editVideo(video: VideoInfo) {
    const res = await api.post(Requester.endpoint.editVideo, video);
    return res.data
  }
}

export default new Requester();
