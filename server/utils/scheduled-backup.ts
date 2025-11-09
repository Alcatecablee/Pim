import { appLogger } from './logger';
import { sharedCache } from './background-refresh';
import { db } from '../db';
import { logs } from '../../shared/schema';
import { desc } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

// Scheduled backup configuration
const BACKUP_INTERVAL_HOURS = parseInt(
  process.env.BACKUP_INTERVAL_HOURS || '24',
  10
);
const BACKUP_RETENTION_DAYS = parseInt(
  process.env.BACKUP_RETENTION_DAYS || '7',
  10
);
const BACKUP_DIR = process.env.BACKUP_DIR || './backups';

let backupIntervalId: NodeJS.Timeout | null = null;
let isRunning = false;

export async function createBackup(): Promise<string | null> {
  try {
    appLogger.info('Starting scheduled backup', {
      timestamp: new Date().toISOString(),
    });

    // Ensure backup directory exists
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    const backup: any = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        automated: true,
      },
      data: {},
    };

    // Export video metadata from cache
    if (sharedCache) {
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
    const recentLogs = await db
      .select()
      .from(logs)
      .orderBy(desc(logs.timestamp))
      .limit(10000);

    backup.data.logs = {
      count: recentLogs.length,
      entries: recentLogs,
    };

    // Calculate backup size
    const backupStr = JSON.stringify(backup, null, 2);
    const backupSizeBytes = backupStr.length;
    backup.metadata.sizeBytes = backupSizeBytes;
    backup.metadata.sizeMB = (backupSizeBytes / 1024 / 1024).toFixed(2);

    // Save backup to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    await fs.writeFile(filepath, backupStr, 'utf-8');

    appLogger.info('Scheduled backup completed', {
      filename,
      sizeBytes: backupSizeBytes,
      sizeMB: backup.metadata.sizeMB,
      videosCount: backup.data.videos?.count || 0,
      logsCount: backup.data.logs?.count || 0,
    });

    // Cleanup old backups
    await cleanupOldBackups();

    return filepath;
  } catch (error) {
    appLogger.error('Scheduled backup failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

export async function cleanupOldBackups(): Promise<void> {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files.filter((f) => f.startsWith('backup-') && f.endsWith('.json'));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - BACKUP_RETENTION_DAYS);

    let deletedCount = 0;

    for (const file of backupFiles) {
      const filepath = path.join(BACKUP_DIR, file);
      const stats = await fs.stat(filepath);

      if (stats.mtime < cutoffDate) {
        await fs.unlink(filepath);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      appLogger.info('Cleaned up old backups', {
        deletedCount,
        retentionDays: BACKUP_RETENTION_DAYS,
      });
    }
  } catch (error) {
    appLogger.error('Backup cleanup failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function verifyBackup(filepath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    const backup = JSON.parse(content);

    // Validate backup structure
    if (!backup.metadata || !backup.data) {
      appLogger.error('Backup verification failed: Invalid structure', {
        filepath,
      });
      return false;
    }

    // Validate data integrity
    if (backup.data.videos && !Array.isArray(backup.data.videos.videos)) {
      appLogger.error('Backup verification failed: Invalid videos array', {
        filepath,
      });
      return false;
    }

    if (backup.data.logs && !Array.isArray(backup.data.logs.entries)) {
      appLogger.error('Backup verification failed: Invalid logs array', {
        filepath,
      });
      return false;
    }

    appLogger.info('Backup verification passed', {
      filepath,
      videosCount: backup.data.videos?.count || 0,
      logsCount: backup.data.logs?.count || 0,
    });

    return true;
  } catch (error) {
    appLogger.error('Backup verification failed', {
      filepath,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export function startScheduledBackup(): void {
  if (isRunning) {
    appLogger.warn('Scheduled backup already running');
    return;
  }

  isRunning = true;
  const intervalMs = BACKUP_INTERVAL_HOURS * 60 * 60 * 1000;

  appLogger.info('Starting scheduled backup service', {
    intervalHours: BACKUP_INTERVAL_HOURS,
    retentionDays: BACKUP_RETENTION_DAYS,
    backupDir: BACKUP_DIR,
  });

  // Run backup immediately on startup
  createBackup().then((filepath) => {
    if (filepath) {
      verifyBackup(filepath);
    }
  });

  // Schedule periodic backups
  backupIntervalId = setInterval(async () => {
    const filepath = await createBackup();
    if (filepath) {
      await verifyBackup(filepath);
    }
  }, intervalMs);
}

export function stopScheduledBackup(): void {
  if (backupIntervalId) {
    clearInterval(backupIntervalId);
    backupIntervalId = null;
    isRunning = false;
    appLogger.info('Scheduled backup service stopped');
  }
}

export function getBackupStatus() {
  return {
    isRunning,
    intervalHours: BACKUP_INTERVAL_HOURS,
    retentionDays: BACKUP_RETENTION_DAYS,
    backupDir: BACKUP_DIR,
  };
}
