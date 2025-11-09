import { Request, Response } from "express";
import { sharedCache } from "../utils/background-refresh";

const UPNSHARE_API_BASE = "https://upnshare.com/api/v1";

/**
 * Get all folders with statistics
 * GET /api/admin/folders
 */
export async function handleGetFolders(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    if (!sharedCache) {
      res.status(503).json({
        error: "Folder data not yet available. Background refresh in progress.",
      });
      return;
    }

    const { videos, folders } = sharedCache.data;

    const folderStats = folders.map((folder) => {
      const folderVideos = videos.filter((v) => v.folder_id === folder.id);
      const totalSize = folderVideos.reduce((sum, v) => sum + (v.size || 0), 0);

      return {
        id: folder.id,
        name: folder.name,
        videoCount: folderVideos.length,
        totalSize,
      };
    });

    const totalVideos = videos.length;
    const totalStorage = videos.reduce((sum, v) => sum + (v.size || 0), 0);

    res.json({
      folders: folderStats,
      totalFolders: folders.length,
      totalVideos,
      totalStorage,
    });
  } catch (error) {
    console.error("[handleGetFolders] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

/**
 * Create a new folder
 * POST /api/admin/folders
 * Body: { name: string, description?: string, folderId?: string }
 */
export async function handleCreateFolder(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { name, description, folderId } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Folder name is required" });
      return;
    }

    const API_TOKEN = process.env.UPNSHARE_API_TOKEN;
    if (!API_TOKEN) {
      res.status(500).json({ error: "API token not configured" });
      return;
    }

    console.log(`[handleCreateFolder] Creating folder: ${name}`);

    const requestBody: any = { name: name.trim() };
    if (description) requestBody.description = description;
    if (folderId) requestBody.folderId = folderId;

    const response = await fetch(`${UPNSHARE_API_BASE}/video/folder`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[handleCreateFolder] Error:`, errorText);
      res.status(response.status).json({
        error: `Failed to create folder: ${response.statusText}`,
      });
      return;
    }

    const data = await response.json();
    console.log(`[handleCreateFolder] Successfully created folder: ${data.id}`);
    res.status(201).json(data);
  } catch (error) {
    console.error("[handleCreateFolder] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

/**
 * Delete a folder
 * DELETE /api/admin/folders/:id
 * Note: Videos in the folder will be moved to root folder
 */
export async function handleDeleteFolder(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "Folder ID is required" });
      return;
    }

    const API_TOKEN = process.env.UPNSHARE_API_TOKEN;
    if (!API_TOKEN) {
      res.status(500).json({ error: "API token not configured" });
      return;
    }

    console.log(`[handleDeleteFolder] Deleting folder: ${id}`);

    const response = await fetch(`${UPNSHARE_API_BASE}/video/folder/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[handleDeleteFolder] Error:`, errorText);
      res.status(response.status).json({
        error: `Failed to delete folder: ${response.statusText}`,
      });
      return;
    }

    console.log(`[handleDeleteFolder] Successfully deleted folder: ${id}`);
    res.status(200).json({ success: true, message: "Folder deleted successfully" });
  } catch (error) {
    console.error("[handleDeleteFolder] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

/**
 * Rename a folder
 * PATCH /api/admin/folders/:id
 * Body: { name?: string, description?: string }
 */
export async function handleRenameFolder(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!id) {
      res.status(400).json({ error: "Folder ID is required" });
      return;
    }

    if (!name && !description) {
      res.status(400).json({ error: "At least one field (name or description) is required" });
      return;
    }

    const API_TOKEN = process.env.UPNSHARE_API_TOKEN;
    if (!API_TOKEN) {
      res.status(500).json({ error: "API token not configured" });
      return;
    }

    console.log(`[handleRenameFolder] Updating folder ${id}`);

    const requestBody: any = {};
    if (name) requestBody.name = name.trim();
    if (description !== undefined) requestBody.description = description;

    const response = await fetch(`${UPNSHARE_API_BASE}/video/folder/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[handleRenameFolder] Error:`, errorText);
      res.status(response.status).json({
        error: `Failed to update folder: ${response.statusText}`,
      });
      return;
    }

    console.log(`[handleRenameFolder] Successfully updated folder: ${id}`);
    res.status(200).json({ success: true, message: "Folder updated successfully" });
  } catch (error) {
    console.error("[handleRenameFolder] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
