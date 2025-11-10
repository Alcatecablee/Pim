import { Request, Response } from 'express';
import { fetchWithAuth } from '../utils/upnshare';

// Cache for realtime stats with short TTL
interface RealtimeCache {
  data: any;
  timestamp: number;
}

let realtimeCache: RealtimeCache | null = null;
const REALTIME_CACHE_TTL = 30 * 1000; // 30 seconds - realtime data changes frequently
const REALTIME_TIMEOUT = 5000; // 5 seconds max for serverless

export async function handleGetRealtime(req: Request, res: Response) {
  try {
    const API_TOKEN = process.env.UPNSHARE_API_TOKEN;
    if (!API_TOKEN) {
      console.error('[handleGetRealtime] No API token found');
      return res.status(500).json({ error: 'API token not configured' });
    }

    // Check cache first
    if (realtimeCache && Date.now() - realtimeCache.timestamp < REALTIME_CACHE_TTL) {
      console.log('[handleGetRealtime] Returning cached data');
      return res.json(realtimeCache.data);
    }

    // Fetch with timeout protection
    const data = await fetchWithAuth(
      'https://upnshare.com/api/v1/video/realtime',
      REALTIME_TIMEOUT
    );
    
    // Update cache
    realtimeCache = {
      data,
      timestamp: Date.now()
    };

    console.log('[handleGetRealtime] Success:', {
      totalItems: data.data?.length || 0
    });

    return res.json(data);
  } catch (error) {
    console.error('[handleGetRealtime] Error:', error);
    
    // If we have stale cache, return it instead of failing
    if (realtimeCache) {
      console.log('[handleGetRealtime] Returning stale cache due to error');
      return res.json(realtimeCache.data);
    }
    
    // No cache available, return empty data instead of error
    return res.json({ 
      data: [],
      message: 'Realtime stats temporarily unavailable'
    });
  }
}
