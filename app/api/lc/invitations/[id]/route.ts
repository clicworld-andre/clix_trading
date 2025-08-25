import { NextRequest, NextResponse } from 'next/server'
import { 
  LCInvitation, 
  InvitationResponse, 
  InvitationResponseResult,
  SystemUser
} from '@/lib/lc/invitation-types'

// Mock invitations storage - shared with main invitations route
const mockInvitations: { [key: string]: LCInvitation } = {}

// Mock current user
const getCurrentUser = (request: NextRequest): SystemUser => {
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

// Accept or reject invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getCurrentUser(request)
    const { id: invitationId } = await params
    const response: InvitationResponse = await request.json()

    // Find invitation
    const invitation = mockInvitations[invitationId]
    if (!invitation) {
      return NextResponse.json(
        { success: false, message: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Verify user is the invitee
    if (invitation.invitee.userId !== currentUser.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - you are not the invitee' },
        { status: 403 }
      )
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: `Invitation already ${invitation.status}` },
        { status: 400 }
      )
    }

    // Check if invitation has expired
    if (new Date() > new Date(invitation.expiresAt)) {
      mockInvitations[invitationId].status = 'expired'
      return NextResponse.json(
        { success: false, message: 'Invitation has expired' },
        { status: 410 }
      )
    }

    // Update invitation status
    const newStatus = response.accepted ? 'accepted' : 'rejected'
    const respondedAt = new Date().toISOString()

    mockInvitations[invitationId] = {
      ...invitation,
      status: newStatus,
      respondedAt,
      response: {
        accepted: response.accepted,
        message: response.message,
        respondedBy: currentUser.id,
        respondedAt
      }
    }

    // If accepted, create a new LC draft with authorized contacts
    let lcId: string | undefined

    if (response.accepted) {
      // Generate LC ID
      lcId = `lc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // In production, this would create an actual LC record with both parties as authorized contacts
      console.log(`✅ LC ${lcId} created with authorized contacts:`)
      console.log(`  - ${invitation.initiator.displayName} (${invitation.initiator.role})`)
      console.log(`  - ${invitation.invitee.displayName} (${invitation.invitee.role})`)
      
      // Simulate Matrix room creation
      const matrixRoomId = `!lc_${lcId}:matrix.clicworld.app`
      console.log(`🏠 Matrix room created: ${matrixRoomId}`)
      
      // Send notification to initiator
      await simulateAcceptanceNotification(invitation, response.message)
    }

    const result: InvitationResponseResult = {
      success: true,
      message: response.accepted 
        ? 'Invitation accepted! You can now collaborate on the LC creation.'
        : 'Invitation rejected.',
      lcId
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error responding to invitation:', error)
    
    return NextResponse.json(
      { success: false, message: 'Failed to process invitation response' },
      { status: 500 }
    )
  }
}

// Get specific invitation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invitationId } = await params
    const invitation = mockInvitations[invitationId]

    if (!invitation) {
      return NextResponse.json(
        { success: false, message: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if invitation has expired and update status
    if (invitation.status === 'pending' && new Date() > new Date(invitation.expiresAt)) {
      mockInvitations[invitationId].status = 'expired'
      invitation.status = 'expired'
    }

    return NextResponse.json({
      success: true,
      invitation
    })

  } catch (error) {
    console.error('Error fetching invitation:', error)
    
    return NextResponse.json(
      { success: false, message: 'Failed to fetch invitation' },
      { status: 500 }
    )
  }
}

// Cancel invitation (only by initiator)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getCurrentUser(request)
    const { id: invitationId } = await params
    const invitation = mockInvitations[invitationId]

    if (!invitation) {
      return NextResponse.json(
        { success: false, message: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Verify user is the initiator
    if (invitation.initiator.userId !== currentUser.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - only initiator can cancel' },
        { status: 403 }
      )
    }

    // Can only cancel pending invitations
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: `Cannot cancel ${invitation.status} invitation` },
        { status: 400 }
      )
    }

    // Update status to cancelled
    mockInvitations[invitationId].status = 'cancelled'
    mockInvitations[invitationId].respondedAt = new Date().toISOString()

    // Send notification to invitee
    console.log(`🚫 Invitation cancelled - notification sent to ${invitation.invitee.displayName}`)

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully'
    })

  } catch (error) {
    console.error('Error cancelling invitation:', error)
    
    return NextResponse.json(
      { success: false, message: 'Failed to cancel invitation' },
      { status: 500 }
    )
  }
}

// Simulate acceptance notification
async function simulateAcceptanceNotification(invitation: LCInvitation, message?: string): Promise<void> {
  console.log(`🎉 Acceptance notification sent to ${invitation.initiator.displayName}:`)
  console.log(`"${invitation.invitee.displayName} accepted your LC collaboration invitation!"`)
  if (message) {
    console.log(`Message: "${message}"`)
  }
  
  // Simulate notification delay
  await new Promise(resolve => setTimeout(resolve, 100))
}