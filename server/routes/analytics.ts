import { Request, Response } from "express";

// TODO: Replace with proper database persistence and time-series data store
// TODO: Fix analytics calculation to use timestamp deltas instead of assuming 1s increments
// TODO: Add debouncing to prevent double-counting from overlapping calls
// LIMITATION: Data is lost on server restart - not suitable for production

interface VideoAnalytics {
  videoId: string;
  totalWatchTime: number; // in seconds
  totalViews: number;
  averageWatchTime: number;
  completionRate: number; // percentage
  engagement: {
    [timestamp: number]: number; // number of viewers at each second
  };
  sessions: VideoSession[];
}

interface VideoSession {
  sessionId: string;
  videoId: string;
  startTime: string;
  endTime?: string;
  watchTime: number; // total seconds watched
  completionPercentage: number;
  seekEvents: number;
  pauseEvents: number;
}

// In-memory storage (replace with database in production)
const analyticsStore = new Map<string, VideoAnalytics>();
const sessionsStore = new Map<string, VideoSession>();

/**
 * Start a playback session
 * POST /api/analytics/session/start
 */
export async function startSession(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { videoId } = req.body;

    if (!videoId || typeof videoId !== "string") {
      res.status(400).json({ error: "Video ID is required" });
      return;
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: VideoSession = {
      sessionId,
      videoId,
      startTime: new Date().toISOString(),
      watchTime: 0,
      completionPercentage: 0,
      seekEvents: 0,
      pauseEvents: 0,
    };

    sessionsStore.set(sessionId, session);

    // Initialize analytics if not exists
    if (!analyticsStore.has(videoId)) {
      analyticsStore.set(videoId, {
        videoId,
        totalWatchTime: 0,
        totalViews: 0,
        averageWatchTime: 0,
        completionRate: 0,
        engagement: {},
        sessions: [],
      });
    }

    console.log(`[startSession] Started session ${sessionId} for video ${videoId}`);
    res.json({ sessionId });
  } catch (error) {
    console.error("[startSession] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

/**
 * Update playback progress
 * POST /api/analytics/session/progress
 */
export async function updateProgress(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { sessionId, currentTime, duration, event } = req.body;

    if (!sessionId || typeof sessionId !== "string") {
      res.status(400).json({ error: "Session ID is required" });
      return;
    }

    const session = sessionsStore.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // Update session data
    // NOTE: This assumes progress updates come every 1 second
    // TODO: Calculate actual time delta from timestamps for accuracy
    if (typeof currentTime === "number") {
      const completionPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
      session.completionPercentage = Math.max(session.completionPercentage, completionPercentage);
      session.watchTime += 1; // LIMITATION: Assumes 1-second intervals
    }

    if (event === "seek") {
      session.seekEvents += 1;
    } else if (event === "pause") {
      session.pauseEvents += 1;
    }

    sessionsStore.set(sessionId, session);

    // Update video engagement heatmap
    const analytics = analyticsStore.get(session.videoId);
    if (analytics && typeof currentTime === "number") {
      const timestamp = Math.floor(currentTime);
      analytics.engagement[timestamp] = (analytics.engagement[timestamp] || 0) + 1;
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[updateProgress] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

/**
 * End a playback session
 * POST /api/analytics/session/end
 */
export async function endSession(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { sessionId } = req.body;

    if (!sessionId || typeof sessionId !== "string") {
      res.status(400).json({ error: "Session ID is required" });
      return;
    }

    const session = sessionsStore.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    session.endTime = new Date().toISOString();
    sessionsStore.set(sessionId, session);

    // Update video analytics
    const analytics = analyticsStore.get(session.videoId);
    if (analytics) {
      analytics.sessions.push(session);
      analytics.totalViews += 1;
      analytics.totalWatchTime += session.watchTime;
      analytics.averageWatchTime = analytics.totalWatchTime / analytics.totalViews;
      
      // Calculate completion rate
      const completedSessions = analytics.sessions.filter(s => s.completionPercentage >= 90).length;
      analytics.completionRate = (completedSessions / analytics.totalViews) * 100;
    }

    console.log(`[endSession] Ended session ${sessionId} - watched ${session.watchTime}s (${session.completionPercentage.toFixed(1)}% complete)`);
    res.json({ success: true });
  } catch (error) {
    console.error("[endSession] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

/**
 * Get video analytics
 * GET /api/analytics/video/:videoId
 */
export async function getVideoAnalytics(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { videoId } = req.params;

    const analytics = analyticsStore.get(videoId);
    if (!analytics) {
      res.json({
        videoId,
        totalWatchTime: 0,
        totalViews: 0,
        averageWatchTime: 0,
        completionRate: 0,
        engagement: {},
        sessions: [],
      });
      return;
    }

    res.json(analytics);
  } catch (error) {
    console.error("[getVideoAnalytics] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

/**
 * Get engagement heatmap for a video
 * GET /api/analytics/video/:videoId/heatmap
 */
export async function getEngagementHeatmap(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { videoId } = req.params;

    const analytics = analyticsStore.get(videoId);
    if (!analytics) {
      res.json({ engagement: {} });
      return;
    }

    res.json({ engagement: analytics.engagement });
  } catch (error) {
    console.error("[getEngagementHeatmap] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
