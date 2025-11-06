import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

let cachedClient = null;

async function connectDB() {
  if (cachedClient) {
    return cachedClient;
  }
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  cachedClient = client;
  return client;
}

// Helper function to fetch YouTube trending videos
async function fetchYouTubeTrending(maxResults = 20) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=US&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.items || [];
}

// Helper function to fetch YouTube search results
async function searchYouTubeVideos(query, maxResults = 20) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.items || [];
}

// Helper function to fetch Reddit videos
async function fetchRedditVideos(subreddit = 'videos', limit = 20) {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Reddit API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data.children || [];
}

// Transform YouTube data to our schema
function transformYouTubeVideo(video, isSearchResult = false) {
  const videoId = isSearchResult ? video.id.videoId : video.id;
  const snippet = video.snippet;
  
  return {
    id: uuidv4(),
    videoId: videoId,
    platform: 'youtube',
    title: snippet.title,
    description: snippet.description,
    thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
    channel: snippet.channelTitle,
    publishedAt: snippet.publishedAt,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    viewCount: parseInt(video.statistics?.viewCount) || 0,
    likeCount: parseInt(video.statistics?.likeCount) || 0,
    duration: video.contentDetails?.duration || 'N/A',
    createdAt: new Date().toISOString()
  };
}

// Transform Reddit data to our schema
function transformRedditVideo(post) {
  const data = post.data;
  let videoUrl = null;
  let embedUrl = null;
  let videoId = null;
  let thumbnail = null;
  
  // Check if it's a Reddit hosted video
  if (data.is_video && data.media?.reddit_video?.fallback_url) {
    videoUrl = data.media.reddit_video.fallback_url;
    embedUrl = videoUrl;
    videoId = data.id;
    
    // Try to get thumbnail from preview images
    if (data.preview?.images?.[0]?.source?.url) {
      thumbnail = data.preview.images[0].source.url.replace(/&amp;/g, '&');
    } else if (data.thumbnail && data.thumbnail.startsWith('http') && data.thumbnail !== 'default') {
      thumbnail = data.thumbnail;
    }
  }
  // Check if it's a YouTube link
  else if (data.url && data.url.includes('youtube.com')) {
    const ytMatch = data.url.match(/[?&]v=([^&]+)/);
    if (ytMatch) {
      videoId = ytMatch[1];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
      // Use YouTube thumbnail for YouTube links
      thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
  }
  else if (data.url && data.url.includes('youtu.be')) {
    const ytMatch = data.url.match(/youtu\.be\/([^?]+)/);
    if (ytMatch) {
      videoId = ytMatch[1];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
      // Use YouTube thumbnail for YouTube links
      thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
  }
  
  if (!embedUrl) return null;
  
  return {
    id: uuidv4(),
    videoId: videoId,
    platform: 'reddit',
    title: data.title,
    description: data.selftext || '',
    thumbnail: thumbnail,
    channel: `r/${data.subreddit}`,
    publishedAt: new Date(data.created_utc * 1000).toISOString(),
    embedUrl: embedUrl,
    viewCount: data.ups || 0,
    likeCount: data.ups || 0,
    commentCount: data.num_comments || 0,
    redditUrl: `https://www.reddit.com${data.permalink}`,
    createdAt: new Date().toISOString()
  };
}

export async function GET(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';
  
  try {
    const client = await connectDB();
    const db = client.db(DB_NAME);
    
    // Root endpoint
    if (path === '/' || path === '') {
      return NextResponse.json({ message: 'Video Aggregator API - Use /youtube/trending or /reddit/videos' });
    }
    
    // YouTube trending videos
    if (path === '/youtube/trending') {
      try {
        const videos = await fetchYouTubeTrending(20);
        const transformedVideos = videos.map(v => transformYouTubeVideo(v, false));
        
        // Store in database
        const collection = db.collection('videos');
        for (const video of transformedVideos) {
          await collection.updateOne(
            { videoId: video.videoId, platform: 'youtube' },
            { $set: video },
            { upsert: true }
          );
        }
        
        return NextResponse.json({ 
          success: true, 
          count: transformedVideos.length,
          videos: transformedVideos 
        });
      } catch (error) {
        console.error('YouTube API Error:', error);
        return NextResponse.json({ 
          success: false, 
          error: error.message 
        }, { status: 500 });
      }
    }
    
    // YouTube search
    if (path.startsWith('/youtube/search')) {
      const url = new URL(request.url);
      const query = url.searchParams.get('q') || 'trending';
      
      try {
        const videos = await searchYouTubeVideos(query, 20);
        const transformedVideos = videos.map(v => transformYouTubeVideo(v, true));
        
        return NextResponse.json({ 
          success: true, 
          count: transformedVideos.length,
          videos: transformedVideos 
        });
      } catch (error) {
        console.error('YouTube Search Error:', error);
        return NextResponse.json({ 
          success: false, 
          error: error.message 
        }, { status: 500 });
      }
    }
    
    // Reddit videos
    if (path === '/reddit/videos') {
      try {
        const posts = await fetchRedditVideos('videos', 50);
        const transformedVideos = posts
          .map(p => transformRedditVideo(p))
          .filter(v => v !== null);
        
        // Store in database
        const collection = db.collection('videos');
        for (const video of transformedVideos) {
          await collection.updateOne(
            { videoId: video.videoId, platform: 'reddit' },
            { $set: video },
            { upsert: true }
          );
        }
        
        return NextResponse.json({ 
          success: true, 
          count: transformedVideos.length,
          videos: transformedVideos 
        });
      } catch (error) {
        console.error('Reddit API Error:', error);
        return NextResponse.json({ 
          success: false, 
          error: error.message 
        }, { status: 500 });
      }
    }
    
    // Get all videos from database
    if (path === '/videos') {
      const url = new URL(request.url);
      const platform = url.searchParams.get('platform');
      const sort = url.searchParams.get('sort') || 'recent';
      
      const collection = db.collection('videos');
      
      let query = {};
      if (platform && platform !== 'all') {
        query.platform = platform;
      }
      
      let sortOption = {};
      if (sort === 'recent') {
        sortOption = { publishedAt: -1 };
      } else if (sort === 'popular') {
        sortOption = { viewCount: -1 };
      }
      
      const videos = await collection
        .find(query)
        .sort(sortOption)
        .limit(50)
        .toArray();
      
      return NextResponse.json({ 
        success: true, 
        count: videos.length,
        videos 
      });
    }
    
    // Get single video by ID
    if (path.startsWith('/video/')) {
      const videoId = path.replace('/video/', '');
      const collection = db.collection('videos');
      
      const video = await collection.findOne({ 
        $or: [
          { id: videoId },
          { videoId: videoId }
        ]
      });
      
      if (!video) {
        return NextResponse.json({ 
          success: false, 
          error: 'Video not found' 
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        success: true, 
        video 
      });
    }
    
    // Get YouTube comments
    if (path.startsWith('/youtube/comments/')) {
      const videoId = path.replace('/youtube/comments/', '');
      
      try {
        const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=relevance&key=${YOUTUBE_API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`YouTube API error: ${response.status}`);
        }
        
        const data = await response.json();
        const comments = data.items?.map(item => ({
          id: item.id,
          author: item.snippet.topLevelComment.snippet.authorDisplayName,
          authorImage: item.snippet.topLevelComment.snippet.authorProfileImageUrl,
          text: item.snippet.topLevelComment.snippet.textDisplay,
          likeCount: item.snippet.topLevelComment.snippet.likeCount,
          publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
          replyCount: item.snippet.totalReplyCount
        })) || [];
        
        return NextResponse.json({ 
          success: true, 
          count: comments.length,
          comments 
        });
      } catch (error) {
        console.error('YouTube Comments Error:', error);
        return NextResponse.json({ 
          success: false, 
          error: error.message 
        }, { status: 500 });
      }
    }
    
    // Get Reddit comments (mock for now)
    if (path.startsWith('/reddit/comments/')) {
      const videoId = path.replace('/reddit/comments/', '');
      
      // Mock Reddit comments until real API credentials are provided
      const mockComments = [
        {
          id: '1',
          author: 'reddit_user_1',
          authorImage: 'https://www.redditstatic.com/avatars/avatar_default_02_A5A4A4.png',
          text: 'This is an amazing video! Thanks for sharing.',
          likeCount: 42,
          publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          replyCount: 3
        },
        {
          id: '2',
          author: 'video_enthusiast',
          authorImage: 'https://www.redditstatic.com/avatars/avatar_default_03_FF4500.png',
          text: 'Great content! Looking forward to more like this.',
          likeCount: 28,
          publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          replyCount: 1
        },
        {
          id: '3',
          author: 'curious_viewer',
          authorImage: 'https://www.redditstatic.com/avatars/avatar_default_04_94E044.png',
          text: 'Does anyone know where I can find more videos like this?',
          likeCount: 15,
          publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          replyCount: 5
        },
        {
          id: '4',
          author: 'tech_lover',
          authorImage: 'https://www.redditstatic.com/avatars/avatar_default_05_46D160.png',
          text: 'The quality on this is incredible!',
          likeCount: 67,
          publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          replyCount: 2
        },
        {
          id: '5',
          author: 'movie_buff',
          authorImage: 'https://www.redditstatic.com/avatars/avatar_default_06_0079D3.png',
          text: 'This deserves way more upvotes. Highly recommended!',
          likeCount: 91,
          publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          replyCount: 7
        }
      ];
      
      return NextResponse.json({ 
        success: true, 
        count: mockComments.length,
        comments: mockComments,
        isMock: true
      });
    }
    
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
