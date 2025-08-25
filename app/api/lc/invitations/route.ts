import { NextRequest, NextResponse } from 'next/server'
import { 
  LCInvitation, 
  SendInvitationRequest, 
  SendInvitationResponse,
  PendingInvitationsResponse,
  InvitationSettings,
  SystemUser
} from '@/lib/lc/invitation-types'

// Mock invitations storage - in production this would be database
const mockInvitations: { [key: string]: LCInvitation } = {}
let invitationIdCounter = 1

// System settings for invitations
const invitationSettings: InvitationSettings = {
  defaultTimeoutDays: 5,
  maxPendingInvitations: 10,
  allowMultipleInvitationsPerLC: false,
  requireEmailVerification: true,
  enableAutoExpiration: true,
  notificationChannels: {
    matrix: true,
    email: true,
    inApp: true
  }
}

// Mock current user - in production this would come from auth
const getCurrentUser = (request: NextRequest): SystemUser => {
  // This would normally be extracted from JWT token or session
  return {
    id: 'user_current',
    matrixId: '@current_user:matrix.clicworld.app',
    displayName: 'Current User',
    email: 'current@example.com',
    company: 'My Trading Company',
    verified: true,
    createdAt: '2024-01-01T00:00:00Z',
    lastActive: '2025-01-10T18:00:00Z',
    preferredCurrencies: ['USDC', 'XLM'],
    tradingRegions: ['Global'],
    businessType: 'Trader'
  }
}

// Mock users lookup
const mockUsers: { [key: string]: SystemUser } = {
  'user_001': {
    id: 'user_001',
    matrixId: '@alice_trader:matrix.clicworld.app',
    displayName: 'Alice Cooper',
    email: 'alice@globaltrading.com',
    company: 'Global Trading Corp',
    verified: true,
    createdAt: '2024-12-01T10:00:00Z',
    lastActive: '2025-01-10T14:30:00Z',
    preferredCurrencies: ['USDC', 'EURC'],
    tradingRegions: ['North America'],
    businessType: 'Importer'
  },
  'user_002': {
    id: 'user_002',
    matrixId: '@bob_exports:matrix.clicworld.app',
    displayName: 'Bob Martinez',
    email: 'bob@premiumexports.co',
    company: 'Premium Exports Ltd',
    verified: true,
    createdAt: '2024-11-15T08:00:00Z',
    lastActive: '2025-01-10T16:45:00Z',
    preferredCurrencies: ['USDC', 'XAU'],
    tradingRegions: ['South America'],
    businessType: 'Exporter'
  }
}

// Send invitation
export async function POST(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    const invitationRequest: SendInvitationRequest = await request.json()
    
    // Validate request
    if (!invitationRequest.inviteeUserId || !invitationRequest.lcTitle) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if invitee exists
    const invitee = mockUsers[invitationRequest.inviteeUserId]
    if (!invitee) {
      return NextResponse.json(
        { success: false, message: 'Invitee not found' },
        { status: 404 }
      )
    }

    // Check for existing pending invitation
    const existingInvitation = Object.values(mockInvitations).find(inv => 
      inv.initiator.userId === currentUser.id && 
      inv.invitee.userId === invitee.id && 
      inv.status === 'pending'
    )
    
    if (existingInvitation) {
      return NextResponse.json(
        { success: false, message: 'Invitation already pending with this user' },
        { status: 400 }
      )
    }

    // Create invitation
    const invitationId = `inv_${invitationIdCounter++}_${Date.now()}`
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + invitationSettings.defaultTimeoutDays)

    const invitation: LCInvitation = {
      id: invitationId,
      lcTitle: invitationRequest.lcTitle,
      initiator: {
        userId: currentUser.id,
        matrixId: currentUser.matrixId,
        displayName: currentUser.displayName,
        role: invitationRequest.initiatorRole
      },
      invitee: {
        userId: invitee.id,
        matrixId: invitee.matrixId,
        displayName: invitee.displayName,
        role: invitationRequest.inviteeRole
      },
      message: invitationRequest.message,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      preliminaryInfo: invitationRequest.preliminaryInfo,
      notificationsSent: {
        matrix: false,
        email: false,
        inApp: false
      }
    }

    // Store invitation
    mockInvitations[invitationId] = invitation

    // Simulate sending notifications (would be actual service calls)
    await simulateNotifications(invitation)

    // Update notification status
    mockInvitations[invitationId].notificationsSent = {
      matrix: true,
      email: true,
      inApp: true
    }

    const response: SendInvitationResponse = {
      success: true,
      invitationId,
      message: 'Invitation sent successfully',
      expiresAt: expiresAt.toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error sending invitation:', error)
    
    return NextResponse.json(
      { success: false, message: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}

// Get pending invitations for current user
export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    
    // Get sent invitations
    const sentInvitations = Object.values(mockInvitations).filter(inv => 
      inv.initiator.userId === currentUser.id
    )
    
    // Get received invitations
    const receivedInvitations = Object.values(mockInvitations).filter(inv => 
      inv.invitee.userId === currentUser.id
    )

    // Count pending invitations
    const sentPending = sentInvitations.filter(inv => inv.status === 'pending').length
    const receivedPending = receivedInvitations.filter(inv => inv.status === 'pending').length

    const response: PendingInvitationsResponse = {
      success: true,
      invitations: {
        sent: sentInvitations,
        received: receivedInvitations
      },
      counts: {
        sentPending,
        receivedPending,
        totalPending: sentPending + receivedPending
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching pending invitations:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        invitations: { sent: [], received: [] },
        counts: { sentPending: 0, receivedPending: 0, totalPending: 0 }
      },
      { status: 500 }
    )
  }
}

// Simulate notification services
async function simulateNotifications(invitation: LCInvitation): Promise<void> {
  // Simulate Matrix DM
  console.log(`📱 Matrix DM sent to ${invitation.invitee.matrixId}:`)
  console.log(`"${invitation.initiator.displayName} invited you to collaborate on LC: ${invitation.lcTitle}"`)
  
  // Simulate email
  console.log(`📧 Email sent to ${mockUsers[invitation.invitee.userId]?.email}:`)
  console.log(`Subject: "LC Collaboration Invitation - ${invitation.lcTitle}"`)
  
  // Simulate in-app notification
  console.log(`🔔 In-app notification created for user ${invitation.invitee.userId}`)
  
  // Add delay to simulate real service calls
  await new Promise(resolve => setTimeout(resolve, 100))
}

// Get system settings
export async function PUT(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    if (action === 'getSettings') {
      return NextResponse.json({
        success: true,
        settings: invitationSettings
      })
    }
    
    // Other actions like updateSettings would go here
    return NextResponse.json(
      { success: false, message: 'Unknown action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error handling settings request:', error)
    
    return NextResponse.json(
      { success: false, message: 'Settings request failed' },
      { status: 500 }
    )
  }
}