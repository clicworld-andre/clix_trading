"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-md text-center">
        <div className="flex justify-center mb-6">
          <AlertTriangle className="h-16 w-16 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Something went wrong!</h1>
        <p className="text-muted-foreground mb-8">
          An error occurred while loading this page. Please try again or contact support if the problem persists.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" asChild>
            <Link href="/admin">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
