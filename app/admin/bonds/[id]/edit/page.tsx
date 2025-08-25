"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import AdminLayout from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, RefreshCw, Save } from "lucide-react"
import { updateToken } from "@/lib/admin-api"

export default function EditTokenPage() {
  const [token, setToken] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    token_name: "",
    code: "",
    asset_type: "",
    sis_number: "",
    maturity: "",
    duration: "",
    returns: "",
    status: "",
    img_url: "",
    shares: "",
    bond_name: "",
  })

  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const id = params.id as string
  const tokenData = searchParams.get("tokenData")

  useEffect(() => {
    if (tokenData) {
      try {
        const parsedToken = JSON.parse(decodeURIComponent(tokenData))
        setToken(parsedToken)
        setFormData({
          token_name: parsedToken.token_name || "",
          code: parsedToken.code || "",
          asset_type: parsedToken.asset_type || "",
          sis_number: parsedToken.sis_number || "",
          maturity: parsedToken.maturity || "",
          duration: parsedToken.duration || "",
          returns: parsedToken.returns || "",
          status: parsedToken.status || "",
          img_url: parsedToken.img_url || "",
          shares: parsedToken.shares || "",
          bond_name: parsedToken.bond_name || "",
        })
        setIsLoading(false)
      } catch (error) {
        console.error("Error parsing token data:", error)
        toast({
          title: "Error",
          description: "Failed to parse token data. Please try again.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    } else {
      // If no token data is provided, redirect back to the tokens list
      toast({
        title: "Error",
        description: "No token data provided. Redirecting to assets list.",
        variant: "destructive",
      })
      setTimeout(() => {
        router.push("/admin/bonds")
      }, 2000)
    }
  }, [tokenData, toast, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      await updateToken(id, formData)
      toast({
        title: "Success",
        description: "Token updated successfully",
      })

      // Update the token data and navigate back to details page
      const updatedToken = { ...token, ...formData }
      const encodedToken = encodeURIComponent(JSON.stringify(updatedToken))
      router.push(`/admin/bonds/${id}?tokenData=${encodedToken}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update token. Please try again.",
        variant: "destructive",
      })
      console.error("Error updating token:", error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-[calc(100vh-200px)]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    )
  }

  if (!token) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <h2 className="text-2xl font-bold mb-4">Token Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The token data is not available. Please return to the tokens list.
          </p>
          <Button onClick={() => router.push("/admin/bonds")}>Return to Assets List</Button>
        </div>
      </AdminLayout>
    )
  }

  const isAssetTypeBond = formData.asset_type?.toLowerCase() === "bond"

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit {isAssetTypeBond ? "Bond" : "Asset"}</h1>
            <p className="text-muted-foreground">Update the details for {token.token_name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Edit the basic details of this {isAssetTypeBond ? "bond" : "asset"}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="asset_type">
                    Asset Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.asset_type}
                    onValueChange={(value) => handleSelectChange("asset_type", value)}
                    disabled
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bond">Bond</SelectItem>
                      <SelectItem value="crypto">Crypto</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Asset type cannot be changed after creation</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="token_name">
                    {isAssetTypeBond ? "Bond Name" : "Asset Name"} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="token_name"
                    name="token_name"
                    value={formData.token_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">
                    Code <span className="text-destructive">*</span>
                  </Label>
                  <Input id="code" name="code" value={formData.code} onChange={handleInputChange} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">
                    Status <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="matured">Matured</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="img_url">Image URL</Label>
                  <Input
                    id="img_url"
                    name="img_url"
                    value={formData.img_url}
                    onChange={handleInputChange}
                    placeholder="https://example.com/image.png"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shares">
                    Shares <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="shares"
                    name="shares"
                    value={formData.shares}
                    onChange={handleInputChange}
                    placeholder="1000000"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {isAssetTypeBond && (
              <Card>
                <CardHeader>
                  <CardTitle>Bond Details</CardTitle>
                  <CardDescription>Edit the bond-specific details</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bond_name">Bond Name</Label>
                    <Input
                      id="bond_name"
                      name="bond_name"
                      value={formData.bond_name}
                      onChange={handleInputChange}
                      placeholder="Series A"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sis_number">SIS Number</Label>
                    <Input id="sis_number" name="sis_number" value={formData.sis_number} onChange={handleInputChange} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maturity">Maturity</Label>
                    <Input
                      id="maturity"
                      name="maturity"
                      value={formData.maturity}
                      onChange={handleInputChange}
                      placeholder="2025-12-31"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      name="duration"
                      value={formData.duration}
                      onChange={handleInputChange}
                      placeholder="5 years"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="returns">Returns</Label>
                    <Input
                      id="returns"
                      name="returns"
                      value={formData.returns}
                      onChange={handleInputChange}
                      placeholder="8.5% p.a."
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end space-x-4">
              <Button variant="outline" type="button" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}
