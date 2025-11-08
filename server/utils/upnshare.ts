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
    if (error instanceof Error && error.name === "AbortError") {
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
  maxPageDelay = 50, // Reduced from 300ms to speed up pagination
): Promise<{ videos: any[]; error?: string }> {
  const allVideos: any[] = [];
  let page = 1;
  const perPage = 100;

  try {
    // First, get the first page to determine how many pages we need
    const firstPageUrl = `${UPNSHARE_API_BASE}/video/folder/${folderId}?page=1&perPage=${perPage}`;
    const firstResponse = await fetchWithAuth(firstPageUrl, 8000);

    const firstVideos = Array.isArray(firstResponse)
      ? firstResponse
      : firstResponse.data || [];
    const metadata = firstResponse.metadata || {};

    if (firstVideos.length > 0) {
      allVideos.push(...firstVideos);
    }

    const maxPage =
      metadata.maxPage || Math.ceil((metadata.total || 0) / perPage);

    // If there's more than one page, fetch remaining pages in parallel
    if (maxPage > 1) {
      const pagePromises: Promise<any[]>[] = [];

      for (let p = 2; p <= maxPage; p++) {
        // Stagger the requests slightly to avoid overwhelming the API
        const promise = (async () => {
          await new Promise((resolve) =>
            setTimeout(resolve, (p - 2) * maxPageDelay),
          );
          try {
            const url = `${UPNSHARE_API_BASE}/video/folder/${folderId}?page=${p}&perPage=${perPage}`;
            const response = await fetchWithAuth(url, 8000);
            const videos = Array.isArray(response)
              ? response
              : response.data || [];
            return videos;
          } catch (error) {
            console.error(
              `Error fetching page ${p} of folder ${folderId}:`,
              error,
            );
            return [];
          }
        })();

        pagePromises.push(promise);
      }

      // Wait for all pages to complete, but with a reasonable timeout
      const pageResults = await Promise.allSettled(pagePromises);
      for (const result of pageResults) {
        if (result.status === "fulfilled" && Array.isArray(result.value)) {
          allVideos.push(...result.value);
        }
      }
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
