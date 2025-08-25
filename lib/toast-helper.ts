// Simple toast helper for notifications
export type ToastVariant = "default" | "success" | "error";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export function showToast({
  title,
  description,
  variant = "default",
  duration = 5000,
}: ToastOptions) {
  // In a real application, this would be implemented with a proper toast library
  // For demo purposes, we'll just log to console
  console.log(`[Toast - ${variant}] ${title}${description ? `: ${description}` : ''}`);
  
  // You would typically use a toast library like react-hot-toast, react-toastify, or sonner
  // Example implementation if using a library:
  // toast({
  //   title,
  //   description,
  //   variant: variant === "error" ? "destructive" : variant,
  //   duration,
  // });
  
  // For now, let's show an alert for demo purposes
  alert(`${title}${description ? `\n${description}` : ''}`);
} 