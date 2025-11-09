import { Request, Response } from 'express';
import { appLogger } from '../utils/logger';
import { getRequestId } from '../middleware/request-id';
import { sharedCache } from '../utils/background-refresh';
import { db } from '../db';
import { logs, users } from '../../shared/schema';
import { desc } from 'drizzle-orm';

// GET /api/admin/backup/export - Export video metadata, logs, and configuration
export async function handleExportBackup(req: Request, res: Response) {
  const requestId = getRequestId(req);
  
  try {
    appLogger.info('Starting backup export', { requestId });

    const format = req.query.format || 'json';
    const includeVideos = req.query.includeVideos !== 'false';
    const includeLogs = req.query.includeLogs !== 'false';
    const includeUsers = req.query.includeUsers !== 'false';

    const backup: any = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        requestId,
      },
      data: {},
    };

    // Export video metadata from cache
    if (includeVideos && sharedCache) {
      backup.data.videos = {
        count: sharedCache.data.videos.length,
        folders: sharedCache.data.folders,
        videos: sharedCache.data.videos.map((video) => ({
          id: video.id,
          title: video.title,
          description: video.description,
          thumbnail: video.thumbnail,
          poster: video.poster,
          duration: video.duration,
          views: video.views,
          folder_id: video.folder_id,
          tags: video.tags,
          created_at: video.created_at,
          updated_at: video.updated_at,
        })),
        cachedAt: new Date(sharedCache.timestamp).toISOString(),
      };
    }

    // Export logs (last 10000 entries)
    if (includeLogs) {
      const recentLogs = await db
        .select()
        .from(logs)
        .orderBy(desc(logs.timestamp))
        .limit(10000);

      backup.data.logs = {
        count: recentLogs.length,
        entries: recentLogs,
      };
    }

    // Export users (without sensitive data)
    if (includeUsers) {
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt,
      }).from(users);

      backup.data.users = {
        count: allUsers.length,
        entries: allUsers,
      };
    }

    // Calculate backup size
    const backupSizeBytes = JSON.stringify(backup).length;
    backup.metadata.sizeBytes = backupSizeBytes;
    backup.metadata.sizeMB = (backupSizeBytes / 1024 / 1024).toFixed(2);

    appLogger.info('Backup export completed', {
      requestId,
      sizeBytes: backupSizeBytes,
      videosCount: backup.data.videos?.count || 0,
      logsCount: backup.data.logs?.count || 0,
      usersCount: backup.data.users?.count || 0,
    });

    // Send as JSON or CSV
    if (format === 'csv') {
      // For CSV, only export videos list
      if (!backup.data.videos) {
        return res.status(400).json({
          error: 'CSV export requires videos to be included',
        });
      }

      const videos = backup.data.videos.videos;
      const csvHeaders = [
        'id',
        'title',
        'folder_id',
        'duration',
        'views',
        'created_at',
      ].join(',');

      const csvRows = videos.map((video: any) =>
        [
          video.id,
          `"${video.title.replace(/"/g, '""')}"`,
          video.folder_id,
          video.duration,
          video.views,
          video.created_at,
        ].join(',')
      );

      const csv = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="videohub-backup-${Date.now()}.csv"`
      );
      res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="videohub-backup-${Date.now()}.json"`
      );
      res.json(backup);
    }
  } catch (error) {
    appLogger.error('Backup export failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({
      error: 'Backup export failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// GET /api/admin/backup/info - Get backup metadata without downloading
export async function handleBackupInfo(req: Request, res: Response) {
  const requestId = getRequestId(req);

  try {
    const info: any = {
      available: true,
      videosAvailable: !!sharedCache,
      videosCount: sharedCache?.data.videos.length || 0,
      foldersCount: sharedCache?.data.folders.length || 0,
      cacheAge: sharedCache
        ? Math.floor((Date.now() - sharedCache.timestamp) / 1000)
        : null,
    };

    // Count logs
    const logsCount = await db
      .select()
      .from(logs)
      .then((rows) => rows.length);
    info.logsCount = logsCount;

    // Count users
    const usersCount = await db
      .select()
      .from(users)
      .then((rows) => rows.length);
    info.usersCount = usersCount;

    // Estimate backup size
    const estimatedSize =
      (info.videosCount * 500 + info.logsCount * 300 + info.usersCount * 200) /
      1024 /
      1024;
    info.estimatedSizeMB = estimatedSize.toFixed(2);

    res.json(info);
  } catch (error) {
    appLogger.error('Backup info failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to get backup info',
    });
  }
}

// POST /api/admin/backup/verify - Verify a backup file
export async function handleVerifyBackup(req: Request, res: Response) {
  const requestId = getRequestId(req);

  try {
    const backup = req.body;

    // Validate backup structure
    if (!backup || typeof backup !== 'object') {
      return res.status(400).json({
        error: 'Invalid backup format',
        valid: false,
      });
    }

    if (!backup.metadata || !backup.data) {
      return res.status(400).json({
        error: 'Backup missing required fields (metadata, data)',
        valid: false,
      });
    }

    // Check version compatibility
    const supportedVersions = ['1.0.0'];
    if (!supportedVersions.includes(backup.metadata.version)) {
      return res.status(400).json({
        error: `Unsupported backup version: ${backup.metadata.version}`,
        valid: false,
        supportedVersions,
      });
    }

    // Validate data structure
    const issues: string[] = [];

    if (backup.data.videos) {
      if (!Array.isArray(backup.data.videos.videos)) {
        issues.push('Invalid videos array');
      }
      if (!Array.isArray(backup.data.videos.folders)) {
        issues.push('Invalid folders array');
      }
    }

    if (backup.data.logs) {
      if (!Array.isArray(backup.data.logs.entries)) {
        issues.push('Invalid logs array');
      }
    }

    if (backup.data.users) {
      if (!Array.isArray(backup.data.users.entries)) {
        issues.push('Invalid users array');
      }
    }

    appLogger.info('Backup verification completed', {
      requestId,
      valid: issues.length === 0,
      issues,
      videosCount: backup.data.videos?.count || 0,
      logsCount: backup.data.logs?.count || 0,
    });

    res.json({
      valid: issues.length === 0,
      issues,
      metadata: backup.metadata,
      summary: {
        videosCount: backup.data.videos?.count || 0,
        logsCount: backup.data.logs?.count || 0,
        usersCount: backup.data.users?.count || 0,
      },
    });
  } catch (error) {
    appLogger.error('Backup verification failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Backup verification failed',
      valid: false,
    });
  }
}
