import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-md text-center">
        <div className="flex justify-center mb-6">
          <AlertCircle className="h-16 w-16 text-destructive" />
        </div>
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">The page you are looking for doesn't exist or has been moved.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild>
            <Link href="/admin">Return to Dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/bonds">View Assets</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
