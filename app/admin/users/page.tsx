"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Search, MoreHorizontal, RefreshCw, Eye, Edit, Trash2, Filter, Mail, Lock, UserPlus } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "user"
  status: "active" | "inactive" | "pending"
  createdAt: string
  lastLogin: string
  avatar?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      // In a real app, you would fetch data from your API
      // For demo purposes, we'll use mock data
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockUsers: User[] = [
        {
          id: "1",
          name: "John Doe",
          email: "john.doe@example.com",
          role: "admin",
          status: "active",
          createdAt: "2023-01-15",
          lastLogin: "2023-05-20T14:30:00",
          avatar: "/placeholder.svg?height=40&width=40",
        },
        {
          id: "2",
          name: "Jane Smith",
          email: "jane.smith@example.com",
          role: "manager",
          status: "active",
          createdAt: "2023-02-10",
          lastLogin: "2023-05-19T09:15:00",
          avatar: "/placeholder.svg?height=40&width=40",
        },
        {
          id: "3",
          name: "Robert Johnson",
          email: "robert.johnson@example.com",
          role: "user",
          status: "inactive",
          createdAt: "2023-03-05",
          lastLogin: "2023-04-30T11:45:00",
        },
        {
          id: "4",
          name: "Emily Davis",
          email: "emily.davis@example.com",
          role: "user",
          status: "active",
          createdAt: "2023-03-20",
          lastLogin: "2023-05-18T16:20:00",
          avatar: "/placeholder.svg?height=40&width=40",
        },
        {
          id: "5",
          name: "Michael Wilson",
          email: "michael.wilson@example.com",
          role: "manager",
          status: "pending",
          createdAt: "2023-04-12",
          lastLogin: "",
        },
      ]

      setUsers(mockUsers)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch users. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    try {
      // In a real app, you would call your API to delete the user
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Remove the user from the local state
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== id))

      toast({
        title: "User deleted",
        description: "The user has been deleted successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the user. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success"
      case "inactive":
        return "secondary"
      case "pending":
        return "warning"
      default:
        return "default"
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default"
      case "manager":
        return "outline"
      case "user":
        return "secondary"
      default:
        return "default"
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Never"

    const date = new Date(dateString)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const filteredUsers = users.filter((user) => {
    // Apply search filter
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())

    // Apply role filter
    const matchesRole = roleFilter === "all" || user.role === roleFilter

    // Apply status filter
    const matchesStatus = statusFilter === "all" || user.status === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Users</h1>
          <Button onClick={() => router.push("/admin/users/create")}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={fetchUsers} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 6 }).map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <div className="h-6 bg-muted animate-pulse rounded"></div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.status === "active" ? "success" : user.status === "inactive" ? "secondary" : "warning"
                        }
                      >
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{formatDate(user.lastLogin)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => router.push(`/admin/users/${user.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/admin/users/${user.id}/edit`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Lock className="h-4 w-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No users found. Try adjusting your filters or add a new user.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  )
}
