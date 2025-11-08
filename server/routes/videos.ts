import { RequestHandler } from "express";
import { Video, VideoFolder, VideosResponse } from "@shared/api";

const UPNSHARE_API_BASE = "https://upnshare.com/api/v1";
const API_TOKEN = process.env.UPNSHARE_API_TOKEN || "";

async function fetchWithAuth(url: string) {
  // Try with Bearer token first
  let response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  // If Bearer fails, try with api_token header
  if (!response.ok && response.status === 401) {
    response = await fetch(url, {
      headers: {
        "api_token": API_TOKEN,
        "Content-Type": "application/json",
      },
    });
  }

  // If that fails, try as query parameter
  if (!response.ok && response.status === 401) {
    const separator = url.includes("?") ? "&" : "?";
    response = await fetch(`${url}${separator}api_token=${API_TOKEN}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`UPNshare API error (${response.status}):`, errorText);
    throw new Error(
      `UPNshare API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return response.json();
}

export const handleGetVideos: RequestHandler = async (req, res) => {
  try {
    if (!API_TOKEN) {
      return res.status(500).json({
        error: "UPNSHARE_API_TOKEN environment variable is not set",
      });
    }

    const allVideos: Video[] = [];
    const allFolders: VideoFolder[] = [];

    const foldersData = await fetchWithAuth(`${UPNSHARE_API_BASE}/video/folder`);

    const folders = Array.isArray(foldersData)
      ? foldersData
      : foldersData.data || [];

    for (const folder of folders) {
      allFolders.push({
        id: folder.id,
        name: folder.name,
        description: folder.description,
        video_count: folder.video_count,
        created_at: folder.created_at,
        updated_at: folder.updated_at,
      });

      const videosInFolder = await fetchWithAuth(
        `${UPNSHARE_API_BASE}/video/folder/${folder.id}`
      );

      const videos = Array.isArray(videosInFolder)
        ? videosInFolder
        : videosInFolder.data || [];

      for (const video of videos) {
        allVideos.push({
          id: video.id,
          title: video.title,
          description: video.description,
          duration: video.duration || 0,
          thumbnail: video.thumbnail,
          poster: video.poster,
          created_at: video.created_at,
          updated_at: video.updated_at,
          views: video.views,
          size: video.size,
        });
      }
    }

    const response: VideosResponse = {
      videos: allVideos,
      folders: allFolders,
      total: allVideos.length,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching videos from UPNshare:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch videos from UPNshare",
    });
  }
};
