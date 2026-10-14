import React, { forwardRef } from "react";

export const Input = forwardRef(function Input(
  {
    className = "",
    size = "md", // "sm" (h-8) | "md" (h-9) | "lg" (h-10)
    hasError = false,
    icon: Icon,
    trailingIcon: TrailingIcon,
    onTrailingIconClick,
    isMono = false,
    ...props
  },
  ref
) {
  const sizeStyles = {
    sm: "h-8 text-xs px-2.5",
    md: "h-9 text-xs px-3",
    lg: "h-10 text-sm px-3.5",
  };

  const iconPaddingLeft = {
    sm: Icon ? "pl-8" : "",
    md: Icon ? "pl-9" : "",
    lg: Icon ? "pl-10" : "",
  };

  const iconPaddingRight = {
    sm: TrailingIcon ? "pr-8" : "",
    md: TrailingIcon ? "pr-9" : "",
    lg: TrailingIcon ? "pr-10" : "",
  };

  return (
    <div className="relative w-full">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5" />
        </div>
      )}
      <input
        ref={ref}
        className={`w-full bg-zinc-950 border rounded-lg text-zinc-100 placeholder:text-zinc-600 transition-colors duration-150 outline-none
          ${isMono ? "font-mono" : ""}
          ${sizeStyles[size] || sizeStyles.md}
          ${iconPaddingLeft[size] || ""}
          ${iconPaddingRight[size] || ""}
          ${
            hasError
              ? "border-rose-500/50 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
              : "border-zinc-800/90 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700/20"
          }
          disabled:opacity-50 disabled:bg-zinc-950/40 disabled:cursor-not-allowed
          ${className}`}
        {...props}
      />
      {TrailingIcon && (
        <button
          type="button"
          onClick={onTrailingIconClick}
          tabIndex={-1}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors cursor-pointer"
        >
          <TrailingIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});
