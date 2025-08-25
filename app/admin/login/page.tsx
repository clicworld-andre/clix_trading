"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Lock, User, RefreshCw } from "lucide-react"
import { adminLogin } from "@/lib/admin-api"

export default function AdminLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await adminLogin(username, password)
      if (response.jwt) {
        toast({
          title: "Login successful",
          description: `Welcome, ${response.fullname}`,
        })
        router.push("/admin/dashboard")

      } else {
        toast({
          title: "Login failed",
          description: response.message,
          variant: "destructive",
        })
      }

    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-altx-100 to-white p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 flex items-center justify-center">
          <div className="w-32 h-32 relative mb-4">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Altx-map-1-EgXAppZERXApyZu1tnjQfCNBmDDx1N.png"
              alt="ALTX Logo"
              fill
              style={{ objectFit: "contain" }}
            />
          </div>
          <CardTitle className="text-2xl font-bold text-altx-500">
            <span className="text-3xl">PELOTON</span>
            <span className="text-sm ml-1">admin</span>
          </CardTitle>
          <CardDescription className="text-center">Login to access the admin dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  className="pl-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-altx-500 hover:bg-altx-600" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" className="text-xs text-muted-foreground" onClick={() => router.push("/")}>
            Return to Chat
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
