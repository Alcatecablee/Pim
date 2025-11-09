import { Request, Response } from "express";

// TODO: Replace with proper database persistence (PostgreSQL, MongoDB, etc.)
// TODO: Add authentication middleware to validate userId from session
// TODO: Add authorization checks to ensure users can only access their own playlists
// LIMITATION: Data is lost on server restart - not suitable for production

interface Playlist {
  id: string;
  name: string;
  description?: string;
  videoIds: string[];
  createdAt: string;
  updatedAt: string;
}

// In-memory storage - TEMPORARY solution for prototype
const playlistsStore = new Map<string, Playlist[]>();

/**
 * Get user playlists
 * GET /api/playlists
 */
export async function getPlaylists(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // SECURITY ISSUE: userId should come from authenticated session, not query param
    const userId = req.query.userId as string || "default";

    const playlists = playlistsStore.get(userId) || [];
    res.json({ playlists });
  } catch (error) {
    console.error("[getPlaylists] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

/**
 * Create a new playlist
 * POST /api/playlists
 */
export async function createPlaylist(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { name, description, videoIds } = req.body;
    const userId = req.query.userId as string || "default";

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Playlist name is required" });
      return;
    }

    if (!Array.isArray(videoIds)) {
      res.status(400).json({ error: "Video IDs must be an array" });
      return;
    }

    const playlist: Playlist = {
      id: `pl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description?.trim() || "",
      videoIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const playlists = playlistsStore.get(userId) || [];
    playlists.push(playlist);
    playlistsStore.set(userId, playlists);

    console.log(`[createPlaylist] Created playlist: ${playlist.name} for user: ${userId}`);
    res.status(201).json({ playlist });
  } catch (error) {
    console.error("[createPlaylist] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

/**
 * Update a playlist
 * PATCH /api/playlists/:id
 */
export async function updatePlaylist(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const { name, description, videoIds } = req.body;
    const userId = req.query.userId as string || "default";

    const playlists = playlistsStore.get(userId) || [];
    const playlistIndex = playlists.findIndex((p) => p.id === id);

    if (playlistIndex === -1) {
      res.status(404).json({ error: "Playlist not found" });
      return;
    }

    const playlist = playlists[playlistIndex];

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({ error: "Invalid playlist name" });
        return;
      }
      playlist.name = name.trim();
    }

    if (description !== undefined) {
      playlist.description = description?.trim() || "";
    }

    if (videoIds !== undefined) {
      if (!Array.isArray(videoIds)) {
        res.status(400).json({ error: "Video IDs must be an array" });
        return;
      }
      playlist.videoIds = videoIds;
    }

    playlist.updatedAt = new Date().toISOString();
    playlists[playlistIndex] = playlist;
    playlistsStore.set(userId, playlists);

    console.log(`[updatePlaylist] Updated playlist: ${playlist.name} for user: ${userId}`);
    res.json({ playlist });
  } catch (error) {
    console.error("[updatePlaylist] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

/**
 * Delete a playlist
 * DELETE /api/playlists/:id
 */
export async function deletePlaylist(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.query.userId as string || "default";

    const playlists = playlistsStore.get(userId) || [];
    const filteredPlaylists = playlists.filter((p) => p.id !== id);

    if (filteredPlaylists.length === playlists.length) {
      res.status(404).json({ error: "Playlist not found" });
      return;
    }

    playlistsStore.set(userId, filteredPlaylists);

    console.log(`[deletePlaylist] Deleted playlist: ${id} for user: ${userId}`);
    res.status(204).send();
  } catch (error) {
    console.error("[deletePlaylist] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

/**
 * Add video to playlist
 * POST /api/playlists/:id/videos
 */
export async function addVideoToPlaylist(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const { videoId } = req.body;
    const userId = req.query.userId as string || "default";

    if (!videoId || typeof videoId !== "string") {
      res.status(400).json({ error: "Video ID is required" });
      return;
    }

    const playlists = playlistsStore.get(userId) || [];
    const playlist = playlists.find((p) => p.id === id);

    if (!playlist) {
      res.status(404).json({ error: "Playlist not found" });
      return;
    }

    if (!playlist.videoIds.includes(videoId)) {
      playlist.videoIds.push(videoId);
      playlist.updatedAt = new Date().toISOString();
      playlistsStore.set(userId, playlists);

      console.log(`[addVideoToPlaylist] Added video ${videoId} to playlist ${id} for user: ${userId}`);
    }

    res.json({ playlist });
  } catch (error) {
    console.error("[addVideoToPlaylist] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

/**
 * Remove video from playlist
 * DELETE /api/playlists/:id/videos/:videoId
 */
export async function removeVideoFromPlaylist(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id, videoId } = req.params;
    const userId = req.query.userId as string || "default";

    const playlists = playlistsStore.get(userId) || [];
    const playlist = playlists.find((p) => p.id === id);

    if (!playlist) {
      res.status(404).json({ error: "Playlist not found" });
      return;
    }

    playlist.videoIds = playlist.videoIds.filter((vid) => vid !== videoId);
    playlist.updatedAt = new Date().toISOString();
    playlistsStore.set(userId, playlists);

    console.log(`[removeVideoFromPlaylist] Removed video ${videoId} from playlist ${id} for user: ${userId}`);
    res.json({ playlist });
  } catch (error) {
    console.error("[removeVideoFromPlaylist] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
