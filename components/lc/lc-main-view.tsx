"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { LCCreationPanel } from "./lc-creation-panel"
import { LCDashboard } from "./lc-dashboard"
import { LCDetailsView } from "./lc-details-view"
import { CounterpartySelectionModal } from "./counterparty-selection-modal"
import { PendingLCsDashboard } from "./pending-lcs-dashboard"
import { LCTerms } from "@/lib/lc/types"
import { 
  Plus, 
  List, 
  TrendingUp,
  FileText,
  Users,
  Shield,
  ArrowLeft
} from "lucide-react"

// Import the LCFormData type from LC creation panel
type LCFormData = {
  lcType: "sight" | "usance" | "revolving"
  amount: string
  currency: "USD" | "EUR" | "GBP" | "JPY" | "XLM" | "USDC" | "EURC" | "CLIX" | "USD1" | "XAU" | "XCOF"
  buyerName: string
  buyerAddress: string
  buyerMatrixId: string
  sellerName: string
  sellerAddress: string
  sellerMatrixId: string
  commodity: string
  quantity: string
  unitPrice: string
  incoterms: "FOB" | "CIF" | "CFR" | "EXW" | "FCA" | "CPT" | "CIP" | "DAT" | "DAP" | "DDP"
  portOfLoading: string
  portOfDestination: string
  expiryDate: string
  latestShipmentDate: string
  requiredDocuments: string[]
  issuingBank?: string
  confirmingBank?: string
  additionalTerms?: string
  partialShipments: boolean
  transhipment: boolean
}

type LCViewMode = 'dashboard' | 'create' | 'view' | 'analytics' | 'pending'

interface LCMainViewProps {
  className?: string
  initialMode?: LCViewMode
}

export function LCMainView({ className, initialMode = 'dashboard' }: LCMainViewProps) {
  const [currentMode, setCurrentMode] = useState<LCViewMode>(initialMode)
  const [selectedLCId, setSelectedLCId] = useState<string | null>(null)
  const [showCounterpartyModal, setShowCounterpartyModal] = useState(false)
  const { toast } = useToast()

  const handleLCCreated = (lcData: LCFormData) => {
    console.log('LC Created:', lcData)
    // Show success and redirect to dashboard
    setCurrentMode('dashboard')
  }

  const handleViewLC = (lcId: string) => {
    setSelectedLCId(lcId)
    setCurrentMode('view')
  }

  const handleBackToDashboard = () => {
    setCurrentMode('dashboard')
    setSelectedLCId(null)
  }

  const handleCreateNewLC = () => {
    setShowCounterpartyModal(true)
  }

  const handleInvitationSent = (invitationId: string) => {
    toast({
      title: "Success! 🚀",
      description: "Your LC collaboration invitation has been sent!"
    })
    setCurrentMode('pending') // Show pending section
  }

  const handleInvitationAccepted = (lcId: string) => {
    setSelectedLCId(lcId)
    setCurrentMode('create') // Proceed to LC creation
    toast({
      title: "Ready to Create! 🎉",
      description: "Both parties have agreed - you can now create the LC together."
    })
  }

  const renderHeader = () => {
    switch (currentMode) {
      case 'create':
        return (
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={handleBackToDashboard}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-clix-orange to-clix-yellow bg-clip-text text-transparent">
                Create New Letter of Credit
              </h1>
              <p className="text-muted-foreground">
                Set up a new trade finance arrangement
              </p>
            </div>
          </div>
        )
      case 'view':
        return (
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={handleBackToDashboard}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-clix-orange to-clix-yellow bg-clip-text text-transparent">
                Letter of Credit Details
              </h1>
              <p className="text-muted-foreground">
                View and manage LC: {selectedLCId}
              </p>
            </div>
          </div>
        )
      case 'pending':
        return (
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={handleBackToDashboard}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-clix-orange to-clix-yellow bg-clip-text text-transparent">
                Pending LC Invitations
              </h1>
              <p className="text-muted-foreground">
                Manage your collaboration requests and approvals
              </p>
            </div>
          </div>
        )
      case 'analytics':
        return (
          <div className="flex items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-clix-orange to-clix-yellow bg-clip-text text-transparent">
                LC Analytics
              </h1>
              <p className="text-muted-foreground">
                Track performance and insights
              </p>
            </div>
          </div>
        )
      default:
        return null // Dashboard renders its own header
    }
  }

  const renderContent = () => {
    switch (currentMode) {
      case 'create':
        return (
          <LCCreationPanel onLCCreated={handleLCCreated} />
        )
      
      case 'view':
        if (!selectedLCId) return null
        return (
          <LCDetailsView 
            lcId={selectedLCId}
            onEdit={(lcId) => {
              setSelectedLCId(lcId)
              setCurrentMode('create') // For now, edit opens create mode
            }}
            onChat={(roomId) => {
              // TODO: Implement chat functionality
              toast({
                title: "Chat Feature",
                description: "Opening Matrix chat room...",
              })
            }}
          />
        )
      
      case 'pending':
        return (
          <PendingLCsDashboard 
            onInvitationAccepted={handleInvitationAccepted}
          />
        )
      
      case 'analytics':
        return (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
            <p className="text-muted-foreground mb-4">
              Advanced analytics and reporting will be available here
            </p>
            <Badge variant="outline">Coming Soon</Badge>
          </div>
        )
      
      default: // dashboard
        return (
          <>
            <LCDashboard 
              onCreateNew={handleCreateNewLC}
              onViewLC={handleViewLC}
              onViewPending={() => setCurrentMode('pending')}
            />
            
            {/* Counterparty Selection Modal */}
            <CounterpartySelectionModal
              open={showCounterpartyModal}
              onClose={() => setShowCounterpartyModal(false)}
              onInvitationSent={handleInvitationSent}
            />
          </>
        )
    }
  }

  // If we're showing dashboard, let it handle its own layout
  if (currentMode === 'dashboard') {
    return (
      <div className={className}>
        {renderContent()}
      </div>
    )
  }

  // For other views, show the header + content layout
  return (
    <div className={`w-full max-w-7xl mx-auto p-6 ${className}`}>
      {renderHeader()}
      <div className="w-full">
        {renderContent()}
      </div>
    </div>
  )
}

// Alternative tabbed view for better navigation
export function LCTabbedView({ className }: { className?: string }) {
  const [selectedLCId, setSelectedLCId] = useState<string | null>(null)

  return (
    <div className={`w-full max-w-7xl mx-auto p-6 ${className}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-clix-orange to-clix-yellow bg-clip-text text-transparent mb-2">
          Trade Finance
        </h1>
        <p className="text-muted-foreground">
          Manage Letters of Credit and trade operations
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="dashboard" className="mt-0">
            <LCDashboard 
              onViewLC={(lcId) => setSelectedLCId(lcId)}
            />
          </TabsContent>

          <TabsContent value="create" className="mt-0">
            <LCCreationPanel />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
              <p className="text-muted-foreground mb-4">
                Advanced analytics and reporting will be available here
              </p>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">LC Settings</h3>
              <p className="text-muted-foreground mb-4">
                Configure default settings and preferences
              </p>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}