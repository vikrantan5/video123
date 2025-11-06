'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ThumbsUp,
  Share2,
  Eye,
  Calendar,
  MessageSquare,
  Loader2,
  ExternalLink
} from 'lucide-react';

// ✅ Extracted main content into a separate component
function WatchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const videoId = searchParams.get('v');
  const platform = searchParams.get('platform') || 'youtube';

  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    if (videoId) {
      fetchVideoDetails();
      fetchComments();
    }
  }, [videoId, platform]);

  const fetchVideoDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/video/${videoId}`);
      const data = await response.json();
      if (data.success) setVideo(data.video);
    } catch (error) {
      console.error('Error fetching video:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    setCommentsLoading(true);
    try {
      const endpoint =
        platform === 'youtube'
          ? `/api/youtube/comments/${videoId}`
          : `/api/reddit/comments/${videoId}`;

      const response = await fetch(endpoint);
      const data = await response.json();
      if (data.success) setComments(data.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const formatCount = (count) => {
    const num = parseInt(count);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
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

  const formatCommentTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading video...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Video not found</h2>
          <Button onClick={() => router.push('/')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <Button variant="ghost" onClick={() => router.push('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Videos
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Section */}
          <div className="lg:col-span-2">
            <div className="aspect-video w-full bg-black rounded-lg overflow-hidden mb-4">
              <iframe
                src={video.embedUrl}
                title={video.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-foreground">{video.title}</h1>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{formatCount(video.viewCount)} views</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(video.publishedAt)}</span>
                  </div>
                  <Badge variant="outline">
                    {video.platform === 'youtube' ? 'YouTube' : 'Reddit'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <ThumbsUp className="w-4 h-4" />
                    {formatCount(video.likeCount)}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                  {video.redditUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open(video.redditUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on Reddit
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Channel Info & Description */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar>
                      <AvatarFallback>{video.channel?.[0] || 'V'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{video.channel}</h3>
                    </div>
                  </div>

                  {video.description && (
                    <div className="mt-3">
                      <p
                        className={`text-sm text-muted-foreground whitespace-pre-wrap ${
                          !showFullDescription ? 'line-clamp-3' : ''
                        }`}
                      >
                        {video.description}
                      </p>
                      {video.description.length > 200 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowFullDescription(!showFullDescription)}
                          className="mt-2 text-xs"
                        >
                          {showFullDescription ? 'Show less' : 'Show more'}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Comments Section */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5" />
                  <h2 className="text-xl font-bold text-foreground">
                    {video.commentCount || comments.length} Comments
                  </h2>
                </div>

                {commentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : comments.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No comments yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <Card key={comment.id}>
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={comment.authorImage} />
                              <AvatarFallback>{comment.author?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm text-foreground">
                                  {comment.author}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatCommentTime(comment.publishedAt)}
                                </span>
                              </div>
                              <p
                                className="text-sm text-foreground mb-2"
                                dangerouslySetInnerHTML={{ __html: comment.text }}
                              />
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                                  <ThumbsUp className="w-3 h-3" />
                                  <span>{formatCount(comment.likeCount)}</span>
                                </button>
                                {comment.replyCount > 0 && (
                                  <span>{comment.replyCount} replies</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-4">Related Videos</h3>
                <p className="text-sm text-muted-foreground text-center py-8">
                  Coming soon...
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ Main export with Suspense wrapper
export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading video...</div>}>
      <WatchContent />
    </Suspense>
  );
}
