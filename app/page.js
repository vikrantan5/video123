// 'use client'

// import { useState, useEffect } from 'react';
// import { Card, CardContent } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// import { PlayCircle, Youtube, Loader2, TrendingUp, Calendar, Eye } from 'lucide-react';
// import { Badge } from '@/components/ui/badge';

// const VideoCard = ({ video, onClick }) => {
//   const formatCount = (count) => {
//     const num = parseInt(count);
//     if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
//     if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
//     return num.toString();
//   };
  
//   const formatDate = (dateStr) => {
//     const date = new Date(dateStr);
//     const now = new Date();
//     const diff = now - date;
//     const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
//     if (days === 0) return 'Today';
//     if (days === 1) return 'Yesterday';
//     if (days < 7) return `${days} days ago`;
//     if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
//     if (days < 365) return `${Math.floor(days / 30)} months ago`;
//     return `${Math.floor(days / 365)} years ago`;
//   };
  
//   return (
//     <Card 
//       className="group overflow-hidden bg-card hover:bg-accent/50 transition-all cursor-pointer border-border hover:border-primary/50"
//       onClick={() => onClick(video)}
//     >
//       <div className="relative aspect-video overflow-hidden bg-muted">
//         <img 
//           src={video.thumbnail || '/api/placeholder/400/225'} 
//           alt={video.title}
//           className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
//         />
//         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
//           <PlayCircle className="w-16 h-16 text-white" />
//         </div>
//         <Badge className="absolute top-2 right-2 bg-black/70 text-white border-none">
//           {video.platform === 'youtube' ? 'YouTube' : 'Reddit'}
//         </Badge>
//       </div>
//       <CardContent className="p-4">
//         <h3 className="font-semibold text-sm line-clamp-2 mb-2 text-foreground group-hover:text-primary transition-colors">
//           {video.title}
//         </h3>
//         <p className="text-xs text-muted-foreground mb-2">{video.channel}</p>
//         <div className="flex items-center gap-3 text-xs text-muted-foreground">
//           <div className="flex items-center gap-1">
//             <Eye className="w-3 h-3" />
//             <span>{formatCount(video.viewCount)}</span>
//           </div>
//           <div className="flex items-center gap-1">
//             <Calendar className="w-3 h-3" />
//             <span>{formatDate(video.publishedAt)}</span>
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// };

// const VideoPlayer = ({ video, onClose }) => {
//   if (!video) return null;
  
//   return (
//     <Dialog open={!!video} onOpenChange={onClose}>
//       <DialogContent className="max-w-4xl bg-background border-border">
//         <DialogHeader>
//           <DialogTitle className="text-foreground">{video.title}</DialogTitle>
//         </DialogHeader>
//         <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
//           <iframe
//             src={video.embedUrl}
//             title={video.title}
//             className="w-full h-full"
//             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//             allowFullScreen
//           />
//         </div>
//         <div className="space-y-2">
//           <div className="flex items-center gap-2 text-sm text-muted-foreground">
//             <Badge variant="outline">{video.platform === 'youtube' ? 'YouTube' : 'Reddit'}</Badge>
//             <span>•</span>
//             <span>{video.channel}</span>
//           </div>
//           {video.description && (
//             <p className="text-sm text-muted-foreground line-clamp-3">{video.description}</p>
//           )}
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// };

// const App = () => {
//   const [videos, setVideos] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [platform, setPlatform] = useState('all');
//   const [sortBy, setSortBy] = useState('recent');
//   const [selectedVideo, setSelectedVideo] = useState(null);
//   const [activeTab, setActiveTab] = useState('all');
  
//   const fetchVideos = async (source = 'db') => {
//     setLoading(true);
//     try {
//       let url = '';
      
//       if (source === 'youtube') {
//         url = '/api/youtube/trending';
//       } else if (source === 'reddit') {
//         url = '/api/reddit/videos';
//       } else {
//         url = `/api/videos?platform=${platform}&sort=${sortBy}`;
//       }
      
//       const response = await fetch(url);
//       const data = await response.json();
      
//       if (data.success) {
//         setVideos(data.videos);
//       } else {
//         console.error('Error fetching videos:', data.error);
//       }
//     } catch (error) {
//       console.error('Error:', error);
//     } finally {
//       setLoading(false);
//     }
//   };
  
//   const handleRefresh = async () => {
//     setLoading(true);
//     try {
//       // Fetch fresh data from both sources
//       await Promise.all([
//         fetch('/api/youtube/trending'),
//         fetch('/api/reddit/videos')
//       ]);
//       // Then fetch combined data
//       await fetchVideos('db');
//     } catch (error) {
//       console.error('Error refreshing:', error);
//       setLoading(false);
//     }
//   };
  
//   useEffect(() => {
//     fetchVideos('db');
//   }, [platform, sortBy]);
  
//   const filteredVideos = videos.filter(video => {
//     if (activeTab === 'all') return true;
//     return video.platform === activeTab;
//   });
  
//   return (
//     <div className="min-h-screen bg-background">
//       {/* Header */}
//       <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
//         <div className="container mx-auto px-4 py-4">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-3">
//               <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
//                 <PlayCircle className="w-6 h-6 text-primary-foreground" />
//               </div>
//               <div>
//                 <h1 className="text-2xl font-bold text-foreground">VideoHub</h1>
//                 <p className="text-xs text-muted-foreground">Discover trending videos</p>
//               </div>
//             </div>
//             <Button 
//               onClick={handleRefresh}
//               disabled={loading}
//               className="gap-2"
//             >
//               {loading ? (
//                 <Loader2 className="w-4 h-4 animate-spin" />
//               ) : (
//                 <TrendingUp className="w-4 h-4" />
//               )}
//               Refresh Feed
//             </Button>
//           </div>
//         </div>
//       </header>
      
//       <div className="container mx-auto px-4 py-8">
//         {/* Filters */}
//         <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
//           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
//             <TabsList className="bg-muted">
//               <TabsTrigger value="all" className="data-[state=active]:bg-background">All Videos</TabsTrigger>
//               <TabsTrigger value="youtube" className="data-[state=active]:bg-background gap-2">
//                 <Youtube className="w-4 h-4" />
//                 YouTube
//               </TabsTrigger>
//               <TabsTrigger value="reddit" className="data-[state=active]:bg-background">Reddit</TabsTrigger>
//             </TabsList>
//           </Tabs>
          
//           <Select value={sortBy} onValueChange={setSortBy}>
//             <SelectTrigger className="w-[180px] bg-card border-border">
//               <SelectValue placeholder="Sort by" />
//             </SelectTrigger>
//             <SelectContent className="bg-card border-border">
//               <SelectItem value="recent">Most Recent</SelectItem>
//               <SelectItem value="popular">Most Popular</SelectItem>
//             </SelectContent>
//           </Select>
//         </div>
        
//         {/* Video Grid */}
//         {loading && videos.length === 0 ? (
//           <div className="flex items-center justify-center py-20">
//             <div className="text-center">
//               <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
//               <p className="text-muted-foreground">Loading videos...</p>
//             </div>
//           </div>
//         ) : filteredVideos.length === 0 ? (
//           <div className="text-center py-20">
//             <PlayCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
//             <h3 className="text-xl font-semibold text-foreground mb-2">No videos found</h3>
//             <p className="text-muted-foreground mb-4">Click "Refresh Feed" to fetch videos</p>
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//             {filteredVideos.map((video) => (
//               <VideoCard 
//                 key={video.id} 
//                 video={video} 
//                 onClick={setSelectedVideo}
//               />
//             ))
//             }
//           </div>
//         )}
//       </div>
      
//       {/* Video Player Modal */}
//       <VideoPlayer 
//         video={selectedVideo} 
//         onClose={() => setSelectedVideo(null)} 
//       />
//     </div>
//   );
// };

// export default App;













'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlayCircle, Youtube, Loader2, TrendingUp, Calendar, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const VideoCard = ({ video, onClick }) => {
  const formatCount = (count) => {
    const num = parseInt(count);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  return (
    <Card
      className="group overflow-hidden bg-card hover:bg-accent/50 transition-all cursor-pointer border-border hover:border-primary/50"
      onClick={() => onClick(video)}
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img
          src={video.thumbnail || '/api/placeholder/400/225'}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <PlayCircle className="w-16 h-16 text-white" />
        </div>
        <Badge className="absolute top-2 right-2 bg-black/70 text-white border-none">
          {video.platform === 'youtube' ? 'YouTube' : 'Reddit'}
        </Badge>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 text-foreground group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        <p className="text-xs text-muted-foreground mb-2">{video.channel}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{formatCount(video.viewCount)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(video.publishedAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const VideoPlayer = ({ video, onClose }) => {
  if (!video) return null;

  return (
    <Dialog open={!!video} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{video.title}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
          <iframe
            src={video.embedUrl}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{video.platform === 'youtube' ? 'YouTube' : 'Reddit'}</Badge>
            <span>•</span>
            <span>{video.channel}</span>
          </div>
          {video.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">{video.description}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const App = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const fetchVideos = async (source = 'db') => {
    setLoading(true);
    try {
      let url = '';

      if (source === 'youtube') {
        url = '/api/youtube/trending';
      } else if (source === 'reddit') {
        url = '/api/reddit/videos';
      } else {
        url = `/api/videos?platform=${platform}&sort=${sortBy}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setVideos(data.videos);
      } else {
        console.error('Error fetching videos:', data.error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([fetch('/api/youtube/trending'), fetch('/api/reddit/videos')]);
      await fetchVideos('db');
    } catch (error) {
      console.error('Error refreshing:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos('db');
  }, [platform, sortBy]);

  // ——————————————————————————————————————————————————————————————
  // PRIORITIZE YOUTUBE FIRST + RESPECT sortBy WITHIN EACH GROUP
  // ——————————————————————————————————————————————————————————————
  const sortedVideos = [...videos].sort((a, b) => {
    // 1. YouTube comes first
    if (a.platform === 'youtube' && b.platform !== 'youtube') return -1;
    if (a.platform !== 'youtube' && b.platform === 'youtube') return 1;

    // 2. Within same platform, apply selected sorting
    if (sortBy === 'recent') {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    }
    // sortBy === 'popular'
    return (b.viewCount || 0) - (a.viewCount || 0);
  });

  const filteredVideos = sortedVideos.filter((video) => {
    if (activeTab === 'all') return true;
    return video.platform === activeTab;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <PlayCircle className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">VideoHub</h1>
                <p className="text-xs text-muted-foreground">Discover trending videos</p>
              </div>
            </div>
            <Button onClick={handleRefresh} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
              Refresh Feed
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="bg-muted">
              <TabsTrigger value="all" className="data-[state=active]:bg-background">
                All Videos
              </TabsTrigger>
              <TabsTrigger value="youtube" className="data-[state=active]:bg-background gap-2">
                <Youtube className="w-4 h-4" />
                YouTube
              </TabsTrigger>
              <TabsTrigger value="reddit" className="data-[state=active]:bg-background">
                Reddit
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Video Grid */}
        {loading && videos.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading videos...</p>
            </div>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-20">
            <PlayCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No videos found</h3>
            <p className="text-muted-foreground mb-4">Click "Refresh Feed" to fetch videos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVideos.map((video) => (
              <VideoCard key={video.id} video={video} onClick={setSelectedVideo} />
            ))}
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      <VideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />
    </div>
  );
};

export default App;