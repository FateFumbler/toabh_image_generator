import { clsx as cx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function clsx(...inputs: ClassValue[]): string {
  return twMerge(cx(inputs));
}

export { cx, type ClassValue };
