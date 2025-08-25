import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const BASE_URL = "https://api.clicworld.app/exchange/"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
