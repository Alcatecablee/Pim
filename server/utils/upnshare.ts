import { Video } from "@shared/api";

export const UPNSHARE_API_BASE = "https://upnshare.com/api/v1";

export async function fetchWithAuth(url: string, timeoutMs = 10000) {
  const API_TOKEN = process.env.UPNSHARE_API_TOKEN || "";
  
  console.log(`[fetchWithAuth] Fetching: ${url}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      headers: {
        "api-token": API_TOKEN,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[fetchWithAuth] API error: ${response.status} ${response.statusText}`,
      );
      console.error(`[fetchWithAuth] Error response body:`, errorText);
      throw new Error(
        `UPNshare API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

let loggedFirst = false;

export function normalizeVideo(video: any, folderId: string): Video {
  if (!loggedFirst) {
    loggedFirst = true;
    console.log("Sample video from API:", JSON.stringify(video, null, 2));
  }

  let assetPath: string | undefined;
  let posterUrl: string | undefined;

  if (video.poster) {
    const assetUrl = video.assetUrl || "https://assets.upns.net";

    if (video.poster.startsWith("/")) {
      posterUrl = assetUrl + video.poster;
    } else {
      posterUrl = video.poster;
    }

    const pathMatch = posterUrl.match(
      /^(https?:\/\/[^/]+)?(\/.*)\/(poster|preview|[^/]+\.(png|jpg|jpeg|webp))$/i,
    );
    if (pathMatch) {
      assetPath = pathMatch[2];
    }
  }

  return {
    id: video.id,
    title: (video.title || video.name || `Video ${video.id}`).trim(),
    description: video.description?.trim() || undefined,
    duration: video.duration || 0,
    thumbnail: video.thumbnail || undefined,
    poster: posterUrl || video.thumbnail || undefined,
    assetUrl: video.assetUrl || "https://assets.upns.net",
    assetPath: assetPath,
    created_at: video.created_at || video.createdAt || undefined,
    updated_at: video.updated_at || video.updatedAt || undefined,
    views: video.views || video.play || 0,
    size: video.size || undefined,
    folder_id: folderId,
  };
}

export async function fetchAllVideosFromFolder(
  folderId: string,
): Promise<{ videos: any[]; error?: string }> {
  const allVideos: any[] = [];
  let page = 1;
  const perPage = 100;

  try {
    while (true) {
      const url = `${UPNSHARE_API_BASE}/video/folder/${folderId}?page=${page}&perPage=${perPage}`;
      const response = await fetchWithAuth(url);

      const videos = Array.isArray(response) ? response : response.data || [];

      const metadata = response.metadata || {};

      if (videos.length > 0) {
        allVideos.push(...videos);
      }

      const currentPage = metadata.currentPage || page;
      const maxPage =
        metadata.maxPage || Math.ceil((metadata.total || 0) / perPage);

      if (!videos.length || currentPage >= maxPage) {
        break;
      }

      page++;

      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return { videos: allVideos };
  } catch (error) {
    console.error(`Error fetching videos from folder ${folderId}:`, error);
    return {
      videos: allVideos,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
