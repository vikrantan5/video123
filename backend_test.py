#!/usr/bin/env python3
"""
Backend API Testing for Video Aggregation Platform
Tests all backend endpoints for functionality and data integrity
"""

import requests
import json
import time
import os
from datetime import datetime

# Configuration
NEXT_PUBLIC_BASE_URL = "https://comment-view.preview.emergentagent.com"
API_BASE = f"{NEXT_PUBLIC_BASE_URL}/api"

def log_test_result(test_name, success, message, response_data=None):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"[{timestamp}] {status} {test_name}")
    print(f"    Message: {message}")
    if response_data and not success:
        print(f"    Response: {json.dumps(response_data, indent=2)[:500]}...")
    print()

def test_api_endpoint(endpoint, expected_fields=None, test_name="API Test"):
    """Generic API endpoint tester"""
    try:
        print(f"Testing {endpoint}...")
        response = requests.get(endpoint, timeout=30)
        
        if response.status_code != 200:
            log_test_result(test_name, False, f"HTTP {response.status_code}", response.text[:200])
            return False, None
            
        data = response.json()
        
        # Check basic response structure
        if not data.get('success'):
            log_test_result(test_name, False, f"API returned success=false: {data.get('error', 'Unknown error')}", data)
            return False, data
            
        # Check expected fields
        if expected_fields:
            for field in expected_fields:
                if field not in data:
                    log_test_result(test_name, False, f"Missing expected field: {field}", data)
                    return False, data
        
        log_test_result(test_name, True, f"Success - Count: {data.get('count', 'N/A')}")
        return True, data
        
    except requests.exceptions.Timeout:
        log_test_result(test_name, False, "Request timeout (30s)")
        return False, None
    except requests.exceptions.RequestException as e:
        log_test_result(test_name, False, f"Request error: {str(e)}")
        return False, None
    except json.JSONDecodeError as e:
        log_test_result(test_name, False, f"Invalid JSON response: {str(e)}")
        return False, None
    except Exception as e:
        log_test_result(test_name, False, f"Unexpected error: {str(e)}")
        return False, None

def validate_video_schema(video, platform, test_name):
    """Validate video object schema"""
    required_fields = ['videoId', 'platform', 'title', 'embedUrl']
    platform_specific_fields = {
        'youtube': ['thumbnail', 'channel', 'viewCount', 'publishedAt'],
        'reddit': ['channel', 'publishedAt']
    }
    
    # Check required fields
    for field in required_fields:
        if field not in video:
            log_test_result(test_name, False, f"Video missing required field: {field}")
            return False
    
    # Check platform matches
    if video.get('platform') != platform:
        log_test_result(test_name, False, f"Platform mismatch: expected {platform}, got {video.get('platform')}")
        return False
    
    # Check platform-specific fields
    if platform in platform_specific_fields:
        for field in platform_specific_fields[platform]:
            if field not in video:
                log_test_result(test_name, False, f"Video missing platform-specific field: {field}")
                return False
    
    return True

def test_youtube_trending():
    """Test YouTube Trending API"""
    print("=" * 60)
    print("TESTING YOUTUBE TRENDING API")
    print("=" * 60)
    
    endpoint = f"{API_BASE}/youtube/trending"
    success, data = test_api_endpoint(
        endpoint, 
        expected_fields=['success', 'count', 'videos'],
        test_name="YouTube Trending API"
    )
    
    if not success:
        return False
    
    videos = data.get('videos', [])
    if len(videos) == 0:
        log_test_result("YouTube Trending Videos", False, "No videos returned")
        return False
    
    # Validate first few videos
    for i, video in enumerate(videos[:3]):
        if not validate_video_schema(video, 'youtube', f"YouTube Video {i+1} Schema"):
            return False
    
    # Check for expected YouTube-specific data
    sample_video = videos[0]
    if not sample_video.get('embedUrl', '').startswith('https://www.youtube.com/embed/'):
        log_test_result("YouTube Embed URL", False, f"Invalid embed URL: {sample_video.get('embedUrl')}")
        return False
    
    log_test_result("YouTube Trending Complete", True, f"Successfully fetched {len(videos)} videos")
    return True

def test_reddit_videos():
    """Test Reddit Videos API"""
    print("=" * 60)
    print("TESTING REDDIT VIDEOS API")
    print("=" * 60)
    
    endpoint = f"{API_BASE}/reddit/videos"
    success, data = test_api_endpoint(
        endpoint,
        expected_fields=['success', 'count', 'videos'],
        test_name="Reddit Videos API"
    )
    
    if not success:
        return False
    
    videos = data.get('videos', [])
    if len(videos) == 0:
        log_test_result("Reddit Videos", False, "No videos returned")
        return False
    
    # Validate first few videos
    for i, video in enumerate(videos[:3]):
        if not validate_video_schema(video, 'reddit', f"Reddit Video {i+1} Schema"):
            return False
    
    # Check for Reddit-specific data
    sample_video = videos[0]
    if not sample_video.get('channel', '').startswith('r/'):
        log_test_result("Reddit Channel Format", False, f"Invalid channel format: {sample_video.get('channel')}")
        return False
    
    log_test_result("Reddit Videos Complete", True, f"Successfully fetched {len(videos)} videos")
    return True

def test_get_videos_database():
    """Test Get Videos from Database API"""
    print("=" * 60)
    print("TESTING GET VIDEOS FROM DATABASE")
    print("=" * 60)
    
    # Test 1: Get all videos
    endpoint = f"{API_BASE}/videos"
    success, data = test_api_endpoint(
        endpoint,
        expected_fields=['success', 'count', 'videos'],
        test_name="Get All Videos"
    )
    
    if not success:
        return False
    
    all_videos_count = data.get('count', 0)
    
    # Test 2: Filter by YouTube platform
    endpoint = f"{API_BASE}/videos?platform=youtube"
    success, data = test_api_endpoint(
        endpoint,
        expected_fields=['success', 'count', 'videos'],
        test_name="Get YouTube Videos"
    )
    
    if success:
        youtube_videos = data.get('videos', [])
        for video in youtube_videos[:2]:
            if video.get('platform') != 'youtube':
                log_test_result("YouTube Filter", False, f"Non-YouTube video in filtered results: {video.get('platform')}")
                return False
    
    # Test 3: Filter by Reddit platform
    endpoint = f"{API_BASE}/videos?platform=reddit"
    success, data = test_api_endpoint(
        endpoint,
        expected_fields=['success', 'count', 'videos'],
        test_name="Get Reddit Videos"
    )
    
    if success:
        reddit_videos = data.get('videos', [])
        for video in reddit_videos[:2]:
            if video.get('platform') != 'reddit':
                log_test_result("Reddit Filter", False, f"Non-Reddit video in filtered results: {video.get('platform')}")
                return False
    
    # Test 4: Sort by popular
    endpoint = f"{API_BASE}/videos?sort=popular"
    success, data = test_api_endpoint(
        endpoint,
        expected_fields=['success', 'count', 'videos'],
        test_name="Sort by Popular"
    )
    
    if success:
        popular_videos = data.get('videos', [])
        if len(popular_videos) >= 2:
            # Check if sorted by viewCount (descending)
            first_views = int(popular_videos[0].get('viewCount', 0))
            second_views = int(popular_videos[1].get('viewCount', 0))
            if first_views < second_views:
                log_test_result("Popular Sort Order", False, f"Videos not sorted by popularity: {first_views} < {second_views}")
                return False
    
    log_test_result("Database Videos Complete", True, f"All database queries working, total videos: {all_videos_count}")
    return True

def test_mongodb_storage():
    """Test MongoDB Storage Integrity"""
    print("=" * 60)
    print("TESTING MONGODB STORAGE")
    print("=" * 60)
    
    # First, ensure we have some data by calling the APIs
    print("Ensuring fresh data in database...")
    
    # Fetch YouTube data
    youtube_success, _ = test_api_endpoint(f"{API_BASE}/youtube/trending", test_name="Pre-populate YouTube")
    time.sleep(2)  # Brief pause between API calls
    
    # Fetch Reddit data  
    reddit_success, _ = test_api_endpoint(f"{API_BASE}/reddit/videos", test_name="Pre-populate Reddit")
    time.sleep(2)
    
    if not (youtube_success and reddit_success):
        log_test_result("MongoDB Storage", False, "Could not populate database for storage test")
        return False
    
    # Now test database retrieval
    success, data = test_api_endpoint(f"{API_BASE}/videos", test_name="Database Retrieval")
    
    if not success:
        return False
    
    videos = data.get('videos', [])
    if len(videos) == 0:
        log_test_result("MongoDB Storage", False, "No videos found in database after API calls")
        return False
    
    # Check for both platforms
    platforms = set(video.get('platform') for video in videos)
    expected_platforms = {'youtube', 'reddit'}
    
    if not expected_platforms.issubset(platforms):
        missing = expected_platforms - platforms
        log_test_result("MongoDB Storage", False, f"Missing platforms in database: {missing}")
        return False
    
    # Test duplicate prevention (upsert functionality)
    # Call YouTube API again and check count doesn't double
    initial_count = len([v for v in videos if v.get('platform') == 'youtube'])
    
    # Call YouTube API again
    test_api_endpoint(f"{API_BASE}/youtube/trending", test_name="Duplicate Test Call")
    time.sleep(2)
    
    # Check count again
    success, data = test_api_endpoint(f"{API_BASE}/videos?platform=youtube", test_name="Post-duplicate Check")
    if success:
        new_count = data.get('count', 0)
        # Allow for some variation due to trending changes, but shouldn't double
        if new_count > initial_count * 1.5:
            log_test_result("Duplicate Prevention", False, f"Possible duplicates: {initial_count} -> {new_count}")
            return False
        else:
            log_test_result("Duplicate Prevention", True, f"Upsert working: {initial_count} -> {new_count}")
    
    log_test_result("MongoDB Storage Complete", True, f"Storage working correctly with {len(videos)} total videos")
    return True

def test_youtube_comments():
    """Test YouTube Comments API"""
    print("=" * 60)
    print("TESTING YOUTUBE COMMENTS API")
    print("=" * 60)
    
    # First get a real YouTube video ID from trending
    print("Getting YouTube video ID from trending...")
    success, data = test_api_endpoint(
        f"{API_BASE}/youtube/trending",
        expected_fields=['success', 'videos'],
        test_name="Get Video ID for Comments"
    )
    
    if not success or not data.get('videos'):
        log_test_result("YouTube Comments", False, "Could not get video ID from trending API")
        return False
    
    video_id = data['videos'][0].get('videoId')
    if not video_id:
        log_test_result("YouTube Comments", False, "No videoId found in trending video")
        return False
    
    print(f"Testing comments for video ID: {video_id}")
    
    # Test comments endpoint
    endpoint = f"{API_BASE}/youtube/comments/{video_id}"
    success, data = test_api_endpoint(
        endpoint,
        expected_fields=['success', 'count', 'comments'],
        test_name="YouTube Comments API"
    )
    
    if not success:
        return False
    
    comments = data.get('comments', [])
    if len(comments) == 0:
        log_test_result("YouTube Comments", False, "No comments returned")
        return False
    
    # Validate comment schema
    required_comment_fields = ['id', 'author', 'authorImage', 'text', 'likeCount', 'publishedAt', 'replyCount']
    sample_comment = comments[0]
    
    for field in required_comment_fields:
        if field not in sample_comment:
            log_test_result("YouTube Comment Schema", False, f"Missing field: {field}")
            return False
    
    # Validate data types
    if not isinstance(sample_comment.get('likeCount'), int):
        log_test_result("YouTube Comment Schema", False, f"likeCount should be integer, got: {type(sample_comment.get('likeCount'))}")
        return False
    
    if not isinstance(sample_comment.get('replyCount'), int):
        log_test_result("YouTube Comment Schema", False, f"replyCount should be integer, got: {type(sample_comment.get('replyCount'))}")
        return False
    
    log_test_result("YouTube Comments Complete", True, f"Successfully fetched {len(comments)} comments with correct schema")
    return True

def test_reddit_comments():
    """Test Reddit Comments API (Mock)"""
    print("=" * 60)
    print("TESTING REDDIT COMMENTS API (MOCK)")
    print("=" * 60)
    
    # Use any video ID since it's mock data
    test_video_id = "test_reddit_video_123"
    
    endpoint = f"{API_BASE}/reddit/comments/{test_video_id}"
    success, data = test_api_endpoint(
        endpoint,
        expected_fields=['success', 'count', 'comments', 'isMock'],
        test_name="Reddit Comments API (Mock)"
    )
    
    if not success:
        return False
    
    # Verify it's marked as mock
    if not data.get('isMock'):
        log_test_result("Reddit Comments Mock Flag", False, "Missing isMock: true flag")
        return False
    
    comments = data.get('comments', [])
    if len(comments) == 0:
        log_test_result("Reddit Comments", False, "No mock comments returned")
        return False
    
    # Validate comment schema matches YouTube format
    required_comment_fields = ['id', 'author', 'authorImage', 'text', 'likeCount', 'publishedAt', 'replyCount']
    sample_comment = comments[0]
    
    for field in required_comment_fields:
        if field not in sample_comment:
            log_test_result("Reddit Comment Schema", False, f"Missing field: {field}")
            return False
    
    # Validate data types
    if not isinstance(sample_comment.get('likeCount'), int):
        log_test_result("Reddit Comment Schema", False, f"likeCount should be integer, got: {type(sample_comment.get('likeCount'))}")
        return False
    
    log_test_result("Reddit Comments Complete", True, f"Successfully fetched {len(comments)} mock comments with correct schema and isMock flag")
    return True

def test_single_video_retrieval():
    """Test Single Video Retrieval API"""
    print("=" * 60)
    print("TESTING SINGLE VIDEO RETRIEVAL API")
    print("=" * 60)
    
    # First get a video ID from the database
    print("Getting video ID from database...")
    success, data = test_api_endpoint(
        f"{API_BASE}/videos",
        expected_fields=['success', 'videos'],
        test_name="Get Video ID for Single Retrieval"
    )
    
    if not success or not data.get('videos'):
        log_test_result("Single Video Retrieval", False, "Could not get video ID from database")
        return False
    
    test_video = data['videos'][0]
    video_id = test_video.get('videoId')
    if not video_id:
        log_test_result("Single Video Retrieval", False, "No videoId found in database video")
        return False
    
    print(f"Testing single video retrieval for ID: {video_id}")
    
    # Test single video endpoint
    endpoint = f"{API_BASE}/video/{video_id}"
    success, data = test_api_endpoint(
        endpoint,
        expected_fields=['success', 'video'],
        test_name="Single Video Retrieval API"
    )
    
    if not success:
        return False
    
    video = data.get('video')
    if not video:
        log_test_result("Single Video Retrieval", False, "No video object returned")
        return False
    
    # Validate the returned video has the correct ID
    if video.get('videoId') != video_id:
        log_test_result("Single Video ID Match", False, f"Expected {video_id}, got {video.get('videoId')}")
        return False
    
    # Validate video schema
    required_fields = ['videoId', 'platform', 'title', 'embedUrl']
    for field in required_fields:
        if field not in video:
            log_test_result("Single Video Schema", False, f"Missing field: {field}")
            return False
    
    log_test_result("Single Video Retrieval Complete", True, f"Successfully retrieved video: {video.get('title', 'Unknown')[:50]}...")
    return True

def test_reddit_thumbnail_fix():
    """Test Reddit Thumbnail Fix"""
    print("=" * 60)
    print("TESTING REDDIT THUMBNAIL FIX")
    print("=" * 60)
    
    # Test Reddit videos endpoint and check thumbnails
    endpoint = f"{API_BASE}/reddit/videos"
    success, data = test_api_endpoint(
        endpoint,
        expected_fields=['success', 'videos'],
        test_name="Reddit Videos for Thumbnail Check"
    )
    
    if not success:
        return False
    
    videos = data.get('videos', [])
    if len(videos) == 0:
        log_test_result("Reddit Thumbnail Fix", False, "No Reddit videos to check thumbnails")
        return False
    
    # Check thumbnail quality
    valid_thumbnails = 0
    total_videos = len(videos)
    
    for video in videos:
        thumbnail = video.get('thumbnail')
        if thumbnail and thumbnail != 'default' and thumbnail.startswith('http'):
            valid_thumbnails += 1
    
    thumbnail_percentage = (valid_thumbnails / total_videos) * 100
    
    if thumbnail_percentage < 50:  # At least 50% should have valid thumbnails
        log_test_result("Reddit Thumbnail Quality", False, f"Only {thumbnail_percentage:.1f}% of videos have valid thumbnails")
        return False
    
    # Check for specific thumbnail improvements
    youtube_linked_videos = [v for v in videos if 'youtube.com' in v.get('embedUrl', '') or 'youtu.be' in v.get('embedUrl', '')]
    
    if youtube_linked_videos:
        sample_yt_video = youtube_linked_videos[0]
        thumbnail = sample_yt_video.get('thumbnail', '')
        if not thumbnail.startswith('https://img.youtube.com/vi/'):
            log_test_result("YouTube Thumbnail Format", False, f"YouTube video should use YouTube thumbnail format, got: {thumbnail}")
            return False
    
    log_test_result("Reddit Thumbnail Fix Complete", True, f"{thumbnail_percentage:.1f}% of videos have valid thumbnails ({valid_thumbnails}/{total_videos})")
    return True

def run_all_tests():
    """Run all backend tests"""
    print("🚀 STARTING BACKEND API TESTS")
    print("=" * 80)
    print(f"Base URL: {NEXT_PUBLIC_BASE_URL}")
    print(f"API Base: {API_BASE}")
    print("=" * 80)
    
    test_results = {}
    
    # Test in priority order - existing tests first
    test_results['youtube_trending'] = test_youtube_trending()
    test_results['reddit_videos'] = test_reddit_videos()
    test_results['database_videos'] = test_get_videos_database()
    test_results['mongodb_storage'] = test_mongodb_storage()
    
    # New feature tests
    test_results['youtube_comments'] = test_youtube_comments()
    test_results['reddit_comments'] = test_reddit_comments()
    test_results['single_video_retrieval'] = test_single_video_retrieval()
    test_results['reddit_thumbnail_fix'] = test_reddit_thumbnail_fix()
    
    # Summary
    print("=" * 80)
    print("🏁 TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(test_results.values())
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name.replace('_', ' ').title()}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Backend APIs are working correctly.")
    else:
        print("⚠️  Some tests failed. Check the detailed output above.")
    
    return test_results

if __name__ == "__main__":
    try:
        results = run_all_tests()
    except KeyboardInterrupt:
        print("\n⏹️  Tests interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error during testing: {str(e)}")