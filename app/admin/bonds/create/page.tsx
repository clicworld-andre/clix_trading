"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, RefreshCw, Save, Upload } from "lucide-react"
import { addToken } from "@/lib/admin-api"

export default function CreateAssetPage() {
  const [assetType, setAssetType] = useState<"bond" | "crypto">("bond")
  const [formData, setFormData] = useState({
    token_name: "",
    code: "",
    asset_type: "bond",
    sis_number: "",
    maturity: "",
    duration: "",
    returns: "",
    status: "active",
    img_url: "",
    shares: "",
    wallet_id: "", // Changed from bond_name to wallet_id
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    if (name === "asset_type") {
      setAssetType(value as "bond" | "crypto")
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0])

      // For demo purposes, we'll use a placeholder URL
      // In a real app, you would upload the image to a server and get the URL
      setFormData((prev) => ({
        ...prev,
        img_url: URL.createObjectURL(e.target.files![0]),
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate form data based on asset type
      if (assetType === "bond") {
        if (!formData.token_name || !formData.code || !formData.shares) {
          throw new Error("Please fill in all required fields for the bond")
        }
      } else {
        if (!formData.token_name || !formData.code || !formData.shares) {
          throw new Error("Please fill in all required fields for the asset")
        }
      }

      // In a real app, you would upload the image first and get the URL
      // For demo purposes, we'll use a placeholder URL if no image is selected
      const finalImgUrl = formData.img_url || "/placeholder.svg?height=200&width=200"

      // Create the token with appropriate fields based on asset type
      const dataToSubmit = {
        ...formData,
        img_url: finalImgUrl,
        asset_type: assetType,
        // For crypto assets, always set status to active
        status: assetType === "crypto" ? "active" : formData.status,
      }

      const response = await addToken(dataToSubmit)
      console.log(response)
      if (response.status === 200) {
        toast({
          title: `${assetType === "bond" ? "Bond" : "Asset"} created`,
          description: `The ${assetType === "bond" ? "bond" : "asset"} has been created successfully.`,
        })

        // Redirect to assets list
        router.push("/admin/bonds")
      } else {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to create the ${assetType}. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-4">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Create New {assetType === "bond" ? "Bond" : "Asset"}</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Asset Type Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Asset Type</CardTitle>
              <CardDescription>Select the type of asset you want to create</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                name="asset_type"
                value={assetType}
                onValueChange={(value) => handleSelectChange("asset_type", value)}
              >
                <SelectTrigger className="w-full md:w-1/3">
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bond">Bond</SelectItem>
                  <SelectItem value="crypto">Crypto Asset</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Enter the basic information about the {assetType === "bond" ? "bond" : "asset"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token_name">
                    {assetType === "bond" ? "Bond Name" : "Asset Name"} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="token_name"
                    name="token_name"
                    placeholder={assetType === "bond" ? "e.g., Uganda Government Bond" : "e.g., Stellar Lumens"}
                    value={formData.token_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">
                    {assetType === "bond" ? "Bond Code" : "Asset Code"} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="code"
                    name="code"
                    placeholder={assetType === "bond" ? "e.g., UGB2025" : "e.g., XLM"}
                    value={formData.code}
                    onChange={handleChange}
                    required
                    maxLength={assetType === "crypto" ? 12 : undefined}
                  />
                  {assetType === "crypto" && (
                    <p className="text-xs text-muted-foreground">Asset code on Stellar (max 12 characters)</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shares">
                    {assetType === "bond" ? "Shares" : "Number of Tokens"} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="shares"
                    name="shares"
                    type="number"
                    placeholder="e.g., 1000000"
                    value={formData.shares}
                    onChange={handleChange}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {assetType === "bond"
                      ? "The total number of shares/units issued for this bond"
                      : "The total supply of tokens to be issued"}
                  </p>
                </div>

                {assetType === "bond" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="wallet_id">Wallet ID</Label>
                      <Input
                        id="wallet_id"
                        name="wallet_id"
                        placeholder="e.g., 159*****"
                        value={formData.wallet_id}
                        onChange={handleChange}
                      />
                      <p className="text-xs text-muted-foreground">The Stellar wallet ID for this bond</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sis_number">SIS Number</Label>
                      <Input
                        id="sis_number"
                        name="sis_number"
                        placeholder="e.g., SIS12345"
                        value={formData.sis_number}
                        onChange={handleChange}
                      />
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
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="matured">Matured</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{assetType === "bond" ? "Bond Details" : "Asset Details"}</CardTitle>
                <CardDescription>
                  Enter the specific details of the {assetType === "bond" ? "bond" : "asset"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {assetType === "bond" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="maturity">Maturity Date</Label>
                      <Input
                        id="maturity"
                        name="maturity"
                        type="date"
                        value={formData.maturity}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration</Label>
                      <Input
                        id="duration"
                        name="duration"
                        placeholder="e.g., 5 years"
                        value={formData.duration}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="returns">Returns</Label>
                      <Input
                        id="returns"
                        name="returns"
                        placeholder="e.g., 8.5% p.a."
                        value={formData.returns}
                        onChange={handleChange}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="img_url">Asset Icon</Label>
                  <div className="flex items-center gap-4">
                    {formData.img_url && (
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        <img
                          src={formData.img_url || "/placeholder.svg"}
                          alt="Asset icon preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <label
                      htmlFor="icon-upload"
                      className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Icon
                      <input
                        id="icon-upload"
                        name="img_url"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">Recommended size: 512x512px. Max size: 2MB.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex justify-end space-x-4">
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
                  Create {assetType === "bond" ? "Bond" : "Asset"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}
