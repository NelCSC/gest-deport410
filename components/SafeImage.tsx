'use client';

import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackLabel?: string;
}

export default function SafeImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  style,
  fallbackLabel,
}: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasError = !src || failedSrc === src;

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#1E293B] text-[#94A3B8] select-none ${className}`}
        style={style}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="w-6 h-6 mb-1.5 opacity-70" />
        {fallbackLabel && (
          <span className="text-xs font-medium text-[#94A3B8] px-2 text-center truncate max-w-full">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      className={className}
      style={style}
    />
  );
}
