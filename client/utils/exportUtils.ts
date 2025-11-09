import { Video } from "@shared/api";

export interface AdminOverview {
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

export function downloadJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCSV(rows: Record<string, unknown>[], filename: string): void {
  if (rows.length === 0) {
    console.warn("No data to export");
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.map(escapeCSV).join(","),
    ...rows.map(row => headers.map(h => escapeCSV(row[h])).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export function exportVideosToCSV(videos: Video[]): void {
  const rows = videos.map(video => ({
    id: video.id,
    title: video.title,
    description: video.description || "",
    duration: formatDuration(video.duration),
    size: formatBytes(video.size || 0),
    views: video.views || 0,
    folder_id: video.folder_id || "",
    created_at: video.created_at || "",
    width: video.width || "",
    height: video.height || "",
    tags: (video.tags || []).join("; ")
  }));

  const timestamp = new Date().toISOString().split("T")[0];
  downloadCSV(rows, `videos-export-${timestamp}.csv`);
}

export function exportVideosToJSON(videos: Video[]): void {
  const timestamp = new Date().toISOString().split("T")[0];
  downloadJSON(videos, `videos-export-${timestamp}.json`);
}

export function exportAnalyticsToCSV(analytics: AdminOverview): void {
  const rows = [
    { metric: "Total Videos", value: analytics.totalVideos },
    { metric: "Total Folders", value: analytics.totalFolders },
    { metric: "Total Storage", value: formatBytes(analytics.totalStorage) },
    { metric: "Active Viewers", value: analytics.activeViewers },
    { metric: "Cache Hit Rate", value: `${analytics.cacheMetrics.hitRate}%` },
    { metric: "Total Requests", value: analytics.cacheMetrics.totalRequests },
    { metric: "Cache Hits", value: analytics.cacheMetrics.cacheHits },
    { metric: "Cache Misses", value: analytics.cacheMetrics.cacheMisses },
    { metric: "Last Updated", value: analytics.lastUpdated }
  ];

  const timestamp = new Date().toISOString().split("T")[0];
  downloadCSV(rows, `analytics-overview-${timestamp}.csv`);
}

export function exportFolderBreakdownToCSV(folderBreakdown: AdminOverview["folderBreakdown"]): void {
  const rows = folderBreakdown.map(folder => ({
    folder_id: folder.folderId,
    folder_name: folder.folderName,
    video_count: folder.videoCount,
    total_size: formatBytes(folder.totalSize)
  }));

  const timestamp = new Date().toISOString().split("T")[0];
  downloadCSV(rows, `folder-breakdown-${timestamp}.csv`);
}

export function exportAnalyticsToJSON(analytics: AdminOverview): void {
  const timestamp = new Date().toISOString().split("T")[0];
  downloadJSON(analytics, `analytics-export-${timestamp}.json`);
}
