import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTmdbImage(path?: string | null, size: "w500" | "original" = "w500") {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export const PROVIDER_TYPES = {
  flatrate: "Subscription",
  rent: "Rent",
  buy: "Buy",
  free: "Free",
  ads: "With Ads",
} as const;
