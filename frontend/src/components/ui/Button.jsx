import React from "react";
import { Loader2 } from "lucide-react";

export function Button({
  children,
  variant = "primary", // "primary" | "secondary" | "outline" | "ghost" | "danger"
  size = "md", // "sm" | "md" | "lg"
  isLoading = false,
  loadingText,
  icon: Icon,
  className = "",
  disabled,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:cursor-not-allowed select-none rounded-lg";

  const sizeStyles = {
    sm: "h-8 px-2.5 text-xs gap-1.5",
    md: "h-9 px-3.5 text-xs gap-2",
    lg: "h-10 px-4 text-sm gap-2",
  };

  const variantStyles = {
    primary:
      "bg-zinc-100 hover:bg-white text-zinc-950 shadow-xs border border-transparent disabled:opacity-50 active:scale-[0.99]",
    secondary:
      "bg-zinc-900 hover:bg-zinc-800/90 text-zinc-200 border border-zinc-800 hover:border-zinc-700 disabled:opacity-40 active:scale-[0.99]",
    outline:
      "bg-transparent hover:bg-zinc-900/60 text-zinc-300 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 disabled:opacity-40 active:scale-[0.99]",
    ghost:
      "bg-transparent hover:bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-transparent disabled:opacity-40",
    danger:
      "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 hover:border-rose-500/30 disabled:opacity-40 active:scale-[0.99]",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${
        variantStyles[variant] || variantStyles.primary
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
          {children}
        </>
      )}
    </button>
  );
}
