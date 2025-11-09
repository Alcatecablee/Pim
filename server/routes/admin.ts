import { Request, Response } from "express";
import { sharedCache } from "../utils/background-refresh";
import { performanceMonitor } from "../utils/monitoring";
import { fetchWithAuth } from "../utils/upnshare";

interface AdminOverview {
  totalVideos: number;
  totalFolders: number;
  totalStorage: number;
  activeViewers: number;
  folderBreakdown: Array<{
    folderId: string;
    folderName: string;
    videoCount: number;
    totalSize: number;
  }>;
  cacheMetrics: {
    hitRate: number;
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
  };
  lastUpdated: string;
}

async function fetchActiveViewers(): Promise<number> {
  try {
    const response = await fetchWithAuth(
      "https://upnshare.com/api/v1/video/realtime",
      3000
    );
    
    const data = response.data || [];
    const totalViewers = data.reduce((sum: number, item: any) => {
      return sum + (item.realtime || 0);
    }, 0);
    
    return totalViewers;
  } catch (error) {
    console.warn("[fetchActiveViewers] Failed to fetch realtime data:", error);
    return 0;
  }
}

export async function handleGetAdminOverview(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    if (!sharedCache) {
      res.status(503).json({
        error: "Admin data not yet available. Background refresh in progress.",
      });
      return;
    }

    const { videos, folders } = sharedCache.data;

    const totalStorage = videos.reduce((sum, video) => sum + (video.size || 0), 0);

    const folderBreakdown = folders.map((folder) => {
      const folderVideos = videos.filter((v) => v.folder_id === folder.id);
      const folderSize = folderVideos.reduce((sum, v) => sum + (v.size || 0), 0);
      
      return {
        folderId: folder.id,
        folderName: folder.name,
        videoCount: folderVideos.length,
        totalSize: folderSize,
      };
    });

    const stats = performanceMonitor.getStats();
    const cacheHitRate = parseFloat(stats.cacheHitRate.replace('%', ''));
    
    const activeViewers = await fetchActiveViewers();

    const overview: AdminOverview = {
      totalVideos: videos.length,
      totalFolders: folders.length,
      totalStorage,
      activeViewers,
      folderBreakdown,
      cacheMetrics: {
        hitRate: cacheHitRate,
        totalRequests: stats.totalRequests,
        cacheHits: stats.cacheHits,
        cacheMisses: stats.cacheMisses,
      },
      lastUpdated: new Date().toISOString(),
    };

    res.json(overview);
  } catch (error) {
    console.error("[handleGetAdminOverview] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
