import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

export const Select = forwardRef(function Select(
  {
    className = "",
    size = "md", // "sm" | "md" | "lg"
    children,
    hasError = false,
    ...props
  },
  ref
) {
  const sizeStyles = {
    sm: "h-8 text-xs pl-2.5 pr-8",
    md: "h-9 text-xs pl-3 pr-8.5",
    lg: "h-10 text-sm pl-3.5 pr-9",
  };

  return (
    <div className="relative w-full">
      <select
        ref={ref}
        className={`w-full appearance-none bg-zinc-950 border rounded-lg text-zinc-100 transition-colors duration-150 outline-none cursor-pointer
          ${sizeStyles[size] || sizeStyles.md}
          ${
            hasError
              ? "border-rose-500/50 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
              : "border-zinc-800/90 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700/20"
          }
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 flex items-center justify-center">
        <ChevronDown className="w-3.5 h-3.5" />
      </div>
    </div>
  );
});
