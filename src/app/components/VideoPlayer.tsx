// components/VideoPlayer.tsx
import React, { useRef, useEffect, useState } from 'react';

interface VideoPlayerProps {
  videoPath: string;
  onEnded?: () => void;
  autoPlay?: boolean;
}

export function VideoPlayer({ videoPath, onEnded, autoPlay = true }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      setIsLoading(false);
      if (autoPlay) {
        video.play().catch(error => {
          console.warn('Auto-play prevented:', error);
          setHasError(true);
        });
      }
    };

    const handleError = () => {
      console.error('Video loading error:', videoPath);
      setIsLoading(false);
      setHasError(true);
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    // Reset states when videoPath changes
    setIsLoading(true);
    setHasError(false);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [videoPath, autoPlay]);

  return (
    <div className="relative flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {hasError ? (
        <div className="text-red-500 text-center">
          <p>Video not found:</p>
          <p className="text-sm">{videoPath}</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={`/videos/${videoPath}`}
          className={`max-w-full max-h-96 ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onEnded={onEnded}
          muted
          playsInline
          preload="auto"
        />
      )}
    </div>
  );
}