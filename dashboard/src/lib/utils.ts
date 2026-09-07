import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge only knows Tailwind's stock scales, so it reads the TailAdmin
// `text-theme-*` / `text-title-*` sizes as text *colors* and the
// `shadow-theme-*` sizes as shadow colors — which silently strips the real
// color off anything sized with them (`text-white` off a primary button, say).
// Registering the scales puts them back in the groups they belong to.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "theme-xs",
            "theme-sm",
            "theme-xl",
            "title-sm",
            "title-md",
            "title-lg",
            "title-xl",
            "title-2xl",
          ],
        },
      ],
      shadow: [
        {
          shadow: [
            "theme-xs",
            "theme-sm",
            "theme-md",
            "theme-lg",
            "theme-xl",
            "focus-ring",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
