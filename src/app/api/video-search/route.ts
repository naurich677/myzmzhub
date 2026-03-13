import { NextRequest, NextResponse } from 'next/server';

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

// VK Video поиск
async function searchVKVideo(query: string, minDuration: number = 2400): Promise<VideoResult[]> {
  try {
    const accessToken = process.env.VK_ACCESS_TOKEN;
    
    if (!accessToken) {
      return [];
    }

    const searchUrl = new URL('https://api.vk.com/method/video.search');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('count', '20');
    searchUrl.searchParams.set('adult', '0');
    searchUrl.searchParams.set('access_token', accessToken);
    searchUrl.searchParams.set('v', '5.199');

    const response = await fetch(searchUrl.toString());
    const data = await response.json();

    if (!data.response?.items) return [];

    return data.response.items
      .filter((item: any) => (item.duration || 0) >= minDuration)
      .map((item: any) => ({
        id: `vk_${item.owner_id}_${item.id}`,
        title: item.title,
        duration: item.duration,
        durationText: formatDuration(item.duration),
        thumbnail: item.image?.[0]?.url || `https://vk.com/images/camera_200.png`,
        source: 'vk' as const,
        embedUrl: `https://vk.com/video_ext.php?oid=${item.owner_id}&id=${item.id}&hd=2`
      }));
  } catch (error) {
    console.error('VK search error:', error);
    return [];
  }
}

// Invidious API (альтернатива YouTube без ключа)
async function searchInvidious(query: string, minDuration: number = 2400): Promise<VideoResult[]> {
  try {
    // Используем публичный инстанс Invidious
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
    // Параллельный поиск
    const [youtubeResults, vkResults, invidiousResults] = await Promise.all([
      searchYouTube(query, minDuration),
      searchVKVideo(query, minDuration),
      searchInvidious(query, minDuration)
    ]);

    // Объединяем и убираем дубликаты
    const allResults = [...vkResults, ...youtubeResults, ...invidiousResults];
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
