import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, Video, FolderOpen, HardDrive, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect } from "react";

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

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

export default function AdminDashboard() {
  const { data, isLoading, error, refetch } = useQuery<AdminOverview>({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const response = await fetch("/api/admin/overview");
      if (!response.ok) {
        throw new Error("Failed to fetch admin overview");
      }
      return response.json();
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (data) {
      console.log("Admin overview data loaded:", data);
    }
  }, [data]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">Failed to load admin dashboard</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
          <p className="text-muted-foreground">
            Your video management dashboard
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetch();
            toast.success("Dashboard refreshed");
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalVideos.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all folders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Folders</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalFolders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Video collections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(data?.totalStorage || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Video storage used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Viewers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.activeViewers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently watching
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Folder Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Videos by Folder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.folderBreakdown.map((folder) => (
              <div
                key={folder.folderId}
                className="flex items-center justify-between border-b pb-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{folder.folderName}</p>
                    <p className="text-sm text-muted-foreground">
                      {folder.videoCount} videos
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatBytes(folder.totalSize)}</p>
                  <p className="text-xs text-muted-foreground">storage</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cache Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Hit Rate</p>
              <p className="text-2xl font-bold">
                {data?.cacheMetrics.hitRate.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-bold">
                {data?.cacheMetrics.totalRequests.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cache Hits</p>
              <p className="text-2xl font-bold">
                {data?.cacheMetrics.cacheHits.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer info */}
      <div className="text-sm text-muted-foreground text-center">
        Last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : "N/A"}
      </div>
    </div>
  );
}
