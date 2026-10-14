import React from "react";

export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`animate-pulse bg-zinc-800/60 rounded-md ${className}`}
      {...props}
    />
  );
}

export function TableSkeletonRows({ rows = 4 }) {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center space-x-4 py-2.5 border-b border-zinc-800/40">
          <Skeleton className="h-4 w-12 shrink-0" />
          <Skeleton className="h-4 w-36 sm:w-48 shrink-0" />
          <Skeleton className="h-4 w-14 shrink-0" />
          <Skeleton className="h-5 w-24 rounded-full shrink-0" />
          <Skeleton className="h-4 w-20 shrink-0 hidden sm:block" />
          <div className="flex items-center space-x-1.5 ml-auto shrink-0">
            <Skeleton className="h-6 w-12 rounded-md" />
            <Skeleton className="h-6 w-12 rounded-md" />
            <Skeleton className="h-6 w-14 rounded-md hidden sm:block" />
          </div>
        </div>
      ))}
    </div>
  );
}
