import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { cn } from '../utils';

interface FaviconProps {
  url: string;
  size?: number;
  className?: string;
}

export const Favicon: React.FC<FaviconProps> = ({ url, size = 32, className }) => {
  const [imgError, setImgError] = useState(false);

  const getHostname = (link: string) => {
    try {
      return new URL(link).hostname;
    } catch {
      return '';
    }
  };

  const hostname = getHostname(url);
  const letter = hostname ? hostname.charAt(0).toUpperCase() : '?';

  // Sources to try. Google is often most reliable globally, Iowen is good for China.
  // We use Google here as primary for stability, or could swap based on preference.
  // Using Google's S2 service which is very fast.
  const src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;

  if (!hostname) {
    return (
      <div 
        className={cn("bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center shrink-0 text-gray-400", className)}
        style={{ width: size, height: size }}
      >
        <Globe size={size * 0.6} />
      </div>
    );
  }

  if (imgError) {
    // Text Avatar Fallback
    return (
        <div 
            className={cn("rounded-lg flex items-center justify-center shrink-0 font-bold text-white bg-gradient-to-br from-violet-400 to-indigo-500 shadow-sm", className)}
            style={{ width: size, height: size, fontSize: size * 0.5 }}
        >
            {letter}
        </div>
    );
  }

  return (
    <img 
      src={src}
      alt={hostname}
      className={cn("bg-white rounded-lg object-contain shrink-0 shadow-sm", className)}
      style={{ width: size, height: size }}
      onError={() => setImgError(true)}
      loading="lazy"
    />
  );
};