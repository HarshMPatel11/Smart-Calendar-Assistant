import * as React from "react"
import { AlertCircle, FileQuestion } from "lucide-react"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-6">
        <FileQuestion className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="mb-2 text-4xl font-bold tracking-tight text-foreground">Page Not Found</h1>
      <p className="mb-8 max-w-[500px] text-lg text-muted-foreground">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link href="/">
        <Button size="lg" className="px-8 font-medium">Return to Dashboard</Button>
      </Link>
    </div>
  )
}
