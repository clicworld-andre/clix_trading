"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, RefreshCw, Save, User, Mail, Lock, Shield } from "lucide-react"

export default function CreateUserPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
    status: "active",
    sendWelcomeEmail: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate form data
      if (!formData.name || !formData.email) {
        throw new Error("Please fill in all required fields")
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match")
      }

      // In a real app, you would call your API to create the user
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "User created",
        description: "The user has been created successfully.",
      })

      // Redirect to users list
      router.push("/admin/users")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create the user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Add New User</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Enter the details for the new user</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      name="name"
                      placeholder="John Doe"
                      className="pl-10"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john.doe@example.com"
                      className="pl-10"
                      value={formData.email}
                      onChange={handleChange}
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
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={formData.password}
                      onChange={handleChange}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Leave blank to generate a random password</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">
                    User Role <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Select
                      name="role"
                      value={formData.role}
                      onValueChange={(value) => handleSelectChange("role", value)}
                      required
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    name="status"
                    value={formData.status}
                    onValueChange={(value) => handleSelectChange("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <Checkbox
                  id="sendWelcomeEmail"
                  checked={formData.sendWelcomeEmail}
                  onCheckedChange={(checked) => handleCheckboxChange("sendWelcomeEmail", checked === true)}
                />
                <Label htmlFor="sendWelcomeEmail">Send welcome email with login instructions</Label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-4">
              <Button variant="outline" type="button" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </AdminLayout>
  )
}
