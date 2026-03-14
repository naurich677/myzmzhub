import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

interface VideoResult {
  id: string;
  title: string;
  duration: number;
  durationText: string;
  thumbnail: string;
  source: 'vk' | 'youtube';
  embedUrl: string;
}

// Парсинг ISO 8601 длительности YouTube
function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  }
  return `${minutes} мин`;
}

// Парсинг длительности из текста (для VK)
function parseDurationFromText(text: string): number {
  const hoursMinutesMatch = text.match(/(\d+)\s*[чh]\s*(\d+)\s*[мm]/i);
  if (hoursMinutesMatch) {
    return parseInt(hoursMinutesMatch[1]) * 3600 + parseInt(hoursMinutesMatch[2]) * 60;
  }
  
  const hoursMatch = text.match(/(\d+)\s*[чh]/i);
  if (hoursMatch) {
    return parseInt(hoursMatch[1]) * 3600;
  }
  
  const minutesMatch = text.match(/(\d+)\s*(?:мин|минут|м|min)/i);
  if (minutesMatch) {
    return parseInt(minutesMatch[1]) * 60;
  }
  
  const timeMatch = text.match(/(\d+):(\d+)(?::(\d+))?/);
  if (timeMatch) {
    if (timeMatch[3]) {
      return parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
    } else {
      const first = parseInt(timeMatch[1]);
      const second = parseInt(timeMatch[2]);
      if (first > 60) {
        return first * 60 + second;
      }
      return first * 3600 + second * 60;
    }
  }
  
  return 0;
}

// YouTube API поиск
async function searchYouTube(query: string, minDuration: number = 2400): Promise<VideoResult[]> {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      console.log('YouTube API key not configured');
      return [];
    }

    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', `${query} полный фильм`);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('videoDuration', 'long');
    searchUrl.searchParams.set('maxResults', '15');
    searchUrl.searchParams.set('key', apiKey);

    const response = await fetch(searchUrl.toString());
    const data = await response.json();

    if (!data.items) return [];

    const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
    
    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('part', 'contentDetails,snippet');
    detailsUrl.searchParams.set('id', videoIds);
    detailsUrl.searchParams.set('key', apiKey);

    const detailsResponse = await fetch(detailsUrl.toString());
    const detailsData = await detailsResponse.json();

    if (!detailsData.items) return [];

    return detailsData.items
      .filter((item: any) => {
        const duration = parseDuration(item.contentDetails.duration);
        return duration >= minDuration;
      })
      .map((item: any) => {
        const duration = parseDuration(item.contentDetails.duration);
        return {
          id: item.id,
          title: item.snippet.title,
          duration,
          durationText: formatDuration(duration),
          thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
          source: 'youtube' as const,
          embedUrl: `https://www.youtube.com/embed/${item.id}?autoplay=1`
        };
      });
  } catch (error) {
    console.error('YouTube search error:', error);
    return [];
  }
}

// VK Video поиск через web-search
async function searchVKVideo(query: string, minDuration: number = 2400): Promise<VideoResult[]> {
  try {
    const zai = await ZAI.create();
    
    // Ищем видео в VK через web search с разными запросами
    const searchQueries = [
      `site:vk.com/video "${query}" фильм`,
      `site:vk.com/video ${query} полный`,
      `site:vk.com/video "${query}" HD`,
    ];

    const allResults: VideoResult[] = [];
    const seenIds = new Set<string>();

    for (const searchQuery of searchQueries) {
      try {
        const searchResult = await zai.functions.invoke("web_search", {
          query: searchQuery,
          num: 15
        });

        if (!searchResult || !Array.isArray(searchResult)) {
          continue;
        }

        for (const item of searchResult) {
          // Проверяем что это видео VK
          const vkVideoMatch = item.url.match(/vk\.com\/video(-?\d+)_(\d+)/);
          if (!vkVideoMatch) continue;

          const ownerId = vkVideoMatch[1];
          const videoId = vkVideoMatch[2];
          const uniqueId = `${ownerId}_${videoId}`;
          
          // Пропускаем дубликаты
          if (seenIds.has(uniqueId)) continue;
          seenIds.add(uniqueId);
          
          // Парсим длительность из сниппета
          const duration = parseDurationFromText(item.snippet || '');
          
          // Пропускаем короткие видео
          if (duration > 0 && duration < minDuration) continue;
          
          const estimatedDuration = duration > 0 ? duration : minDuration;

          allResults.push({
            id: `vk_${ownerId}_${videoId}`,
            title: item.name || `${query} - VK Video`,
            duration: estimatedDuration,
            durationText: duration > 0 ? formatDuration(duration) : '> 40 мин',
            thumbnail: `https://vk.com/images/camera_200.png`,
            source: 'vk' as const,
            embedUrl: `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hd=2&autoplay=1`
          });
        }
      } catch (e) {
        console.error('VK search query error:', e);
        continue;
      }
    }

    return allResults.slice(0, 10);
  } catch (error) {
    console.error('VK search error:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const minDuration = parseInt(searchParams.get('minDuration') || '2400', 10);

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    console.log(`Searching for: "${query}"`);
    
    // Параллельный поиск - VK и YouTube
    const [vkResults, youtubeResults] = await Promise.all([
      searchVKVideo(query, minDuration),
      searchYouTube(query, minDuration)
    ]);

    console.log(`Found: VK=${vkResults.length}, YouTube=${youtubeResults.length}`);

    // Объединяем - VK первые, потом YouTube
    const allResults = [...vkResults, ...youtubeResults];
    const uniqueResults = allResults.filter((result, index, self) =>
      index === self.findIndex(r => r.id === result.id)
    );

    return NextResponse.json({
      query,
      minDuration,
      totalResults: uniqueResults.length,
      results: uniqueResults
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
