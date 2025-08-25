"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, CreditCard, Users, Settings, LogOut, ChevronDown, Menu, X } from "lucide-react"
import { useMobile } from "@/hooks/use-mobile"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { isAuthenticated, clearJwtToken } from "@/lib/admin-api"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [user, setUser] = useState<{ name: string; email: string; image?: string } | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useMobile()
  const { toast } = useToast()

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('admin_jwt_token');
        const userDataStr = localStorage.getItem('user_data');
        let userData = null;
        if (userDataStr) {
          try {
            userData = JSON.parse(userDataStr);
          } catch (e) {
            userData = null;
          }
        }
        const userId = userData?.user_id;
        const username = userData?.username;
        const role = userData?.role;
        const fullname = userData?.fullname;
        const email = userData?.email;

        console.log('Checking auth with:', { token, userId, username, role, fullname, email });

        // Only check for token and username
        if (!token || !username) {
          console.log('Missing required credentials');
          router.push('/admin/login');
          return;
        }

        // Set user state from localStorage immediately
        setUser({
          name: fullname || username,
          email: email || username,
          image: "/placeholder.svg?height=40&width=40"
        });

      
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/admin/login');
      }
    }

    checkAuth()
  }, [router])

  // Close sidebar on mobile by default
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false)
    } else {
      setIsSidebarOpen(true)
    }
  }, [isMobile])

  const handleLogout = () => {
    clearJwtToken()
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    })
    router.push("/admin/login")
  }

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: "Assets",
      href: "/admin/bonds",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      name: "Users",
      href: "/admin/users",
      icon: <Users className="h-5 w-5" />,
    },
    {
      name: "Settings",
      href: "/admin/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center">
              <div className="w-8 h-8 relative mr-2">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Altx-map-1-EgXAppZERXApyZu1tnjQfCNBmDDx1N.png"
                  alt="ALTX Logo"
                  fill
                  style={{ objectFit: "contain" }}
                />
              </div>
              <span className="font-bold text-primary">
                <span className="text-xl">PELOTON</span>
                <span className="text-xs ml-1">admin</span>
              </span>
            </div>
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navigationItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? "default" : "ghost"}
                className={`w-full justify-start ${pathname === item.href ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent"}`}
                onClick={() => {
                  router.push(item.href)
                  if (isMobile) setIsSidebarOpen(false)
                }}
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </Button>
            ))}
          </nav>

          {/* User profile */}
          <div className="p-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start hover:bg-accent">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src={user?.image || "/placeholder.svg"} alt={user?.name || "User"} />
                      <AvatarFallback>
                        {user?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left mr-2">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/admin/profile")}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/admin/settings")}>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-4">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex-1" />
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              Return to Chat
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
