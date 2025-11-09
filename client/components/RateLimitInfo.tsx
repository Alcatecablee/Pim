import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface RateLimitData {
  limit: number;
  remaining: number;
  reset: number;
  endpoint?: string;
}

export function RateLimitInfo() {
  const [rateLimits, setRateLimits] = useState<RateLimitData[]>([
    { limit: 1000, remaining: 847, reset: Date.now() + 3600000, endpoint: "/api/videos" },
    { limit: 100, remaining: 73, reset: Date.now() + 3600000, endpoint: "/api/upload" },
    { limit: 500, remaining: 423, reset: Date.now() + 3600000, endpoint: "/api/analytics" },
  ]);

  const getUsagePercentage = (limit: number, remaining: number) => {
    return ((limit - remaining) / limit) * 100;
  };

  const getUsageStatus = (percentage: number) => {
    if (percentage < 50) return { color: "text-green-500", status: "Good" };
    if (percentage < 80) return { color: "text-yellow-500", status: "Moderate" };
    return { color: "text-red-500", status: "High" };
  };

  const formatResetTime = (resetTimestamp: number) => {
    const now = Date.now();
    const diff = resetTimestamp - now;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setRateLimits((prev) => [...prev]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          API Rate Limits
        </CardTitle>
        <CardDescription>
          Monitor your API usage and rate limit status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rateLimits.map((limit, index) => {
          const percentage = getUsagePercentage(limit.limit, limit.remaining);
          const status = getUsageStatus(percentage);

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {limit.endpoint}
                  </code>
                  <Badge variant="outline" className={cn("gap-1", status.color)}>
                    {percentage < 80 ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {status.status}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  Resets in {formatResetTime(limit.reset)}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {limit.remaining} / {limit.limit} remaining
                  </span>
                  <span className={cn("font-medium", status.color)}>
                    {percentage.toFixed(0)}% used
                  </span>
                </div>
                <Progress
                  value={percentage}
                  className={cn(
                    "h-2",
                    percentage >= 80 && "[&>div]:bg-red-500",
                    percentage >= 50 && percentage < 80 && "[&>div]:bg-yellow-500"
                  )}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
