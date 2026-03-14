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
  // Ищем паттерны типа "2:15:30", "1ч 30м", "135 мин", "90 минут"
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
      // HH:MM:SS
      return parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
    } else {
      // MM:SS или HH:MM (если первое число > 60, то это минуты)
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
    searchUrl.searchParams.set('maxResults', '10');
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
    
    // Ищем видео в VK через web search
    const searchResult = await zai.functions.invoke("web_search", {
      query: `site:vk.com/video "${query}" полный фильм`,
      num: 20
    });

    if (!searchResult || !Array.isArray(searchResult)) {
      return [];
    }

    const results: VideoResult[] = [];
    
    for (const item of searchResult) {
      // Проверяем что это видео VK
      const vkVideoMatch = item.url.match(/vk\.com\/video(-?\d+)_(\d+)/);
      if (!vkVideoMatch) continue;

      const ownerId = vkVideoMatch[1];
      const videoId = vkVideoMatch[2];
      
      // Парсим длительность из сниппета
      const duration = parseDurationFromText(item.snippet || '');
      
      // Пропускаем короткие видео
      if (duration > 0 && duration < minDuration) continue;
      
      // Если длительность не найдена в сниппете, всё равно добавляем (возможно это длинное видео)
      const estimatedDuration = duration > 0 ? duration : minDuration;

      results.push({
        id: `vk_${ownerId}_${videoId}`,
        title: item.name || `${query} - VK Video`,
        duration: estimatedDuration,
        durationText: duration > 0 ? formatDuration(duration) : '> 40 мин',
        thumbnail: `https://vk.com/images/camera_200.png`,
        source: 'vk' as const,
        embedUrl: `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hd=2&autoplay=1`
      });
    }

    return results.slice(0, 5);
  } catch (error) {
    console.error('VK search error:', error);
    return [];
  }
}

// Invidious API (альтернатива YouTube)
async function searchInvidious(query: string, minDuration: number = 2400): Promise<VideoResult[]> {
  try {
    const instances = [
      'https://vid.puffyan.us',
      'https://invidious.snopyta.org',
      'https://yewtu.be'
    ];

    for (const instance of instances) {
      try {
        const searchUrl = `${instance}/api/v1/search?q=${encodeURIComponent(query + ' полный фильм')}&type=video`;
        
        const response = await fetch(searchUrl, {
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) continue;

        const data = await response.json();

        if (!Array.isArray(data)) continue;

        return data
          .filter((item: any) => (item.lengthSeconds || 0) >= minDuration)
          .slice(0, 5)
          .map((item: any) => ({
            id: item.videoId,
            title: item.title,
            duration: item.lengthSeconds,
            durationText: formatDuration(item.lengthSeconds),
            thumbnail: item.videoThumbnails?.[0]?.url || '',
            source: 'youtube' as const,
            embedUrl: `https://www.youtube.com/embed/${item.videoId}?autoplay=1`
          }));
      } catch {
        continue;
      }
    }

    return [];
  } catch (error) {
    console.error('Invidious search error:', error);
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
    // Параллельный поиск - сначала VK, потом YouTube
    const [vkResults, youtubeResults] = await Promise.all([
      searchVKVideo(query, minDuration),
      searchYouTube(query, minDuration)
    ]);

    // Если YouTube не дал результатов, пробуем Invidious
    let ytResults = youtubeResults;
    if (youtubeResults.length === 0) {
      ytResults = await searchInvidious(query, minDuration);
    }

    // Объединяем - VK первые, потом YouTube
    const allResults = [...vkResults, ...ytResults];
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
