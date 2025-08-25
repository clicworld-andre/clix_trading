/**
 * Chat Archive Service
 * 
 * This service handles archiving of Matrix chat messages when trades are completed,
 * including message encryption/decryption and hash generation for proof of chat.
 */

import { MatrixEvent } from 'matrix-js-sdk'
import { ArchivedChatMessage, ChatArchive, TradeHistoryOperationResult } from './trade-history-types'

// Crypto utilities for basic encryption (in production, use proper crypto libraries)
class SimpleEncryption {
  /**
   * Generate a simple encryption key (in production, use proper key derivation)
   */
  static generateKey(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => 
      byte.toString(16).padStart(2, '0')
    ).join('')
  }

  /**
   * Simple XOR encryption (in production, use AES or similar)
   */
  static encrypt(text: string, key: string): string {
    try {
      const keyBytes = this.hexToBytes(key)
      const textBytes = new TextEncoder().encode(text)
      const encrypted = new Uint8Array(textBytes.length)
      
      for (let i = 0; i < textBytes.length; i++) {
        encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length]
      }
      
      return Array.from(encrypted, byte => 
        byte.toString(16).padStart(2, '0')
      ).join('')
    } catch (error) {
      console.error('Encryption error:', error)
      return text // Fallback to unencrypted
    }
  }

  /**
   * Simple XOR decryption (in production, use AES or similar)
   */
  static decrypt(encryptedHex: string, key: string): string {
    try {
      const keyBytes = this.hexToBytes(key)
      const encryptedBytes = this.hexToBytes(encryptedHex)
      const decrypted = new Uint8Array(encryptedBytes.length)
      
      for (let i = 0; i < encryptedBytes.length; i++) {
        decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length]
      }
      
      return new TextDecoder().decode(decrypted)
    } catch (error) {
      console.error('Decryption error:', error)
      return encryptedHex // Fallback to encrypted text
    }
  }

  /**
   * Convert hex string to bytes
   */
  private static hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
    }
    return bytes
  }
}

export class ChatArchiveService {
  private client: any // Matrix client

  constructor(client: any) {
    this.client = client
  }

  /**
   * Archive all messages from a Matrix room
   */
  async archiveRoomMessages(
    roomId: string,
    startTimestamp?: number,
    endTimestamp?: number
  ): Promise<TradeHistoryOperationResult<ChatArchive>> {
    try {
      if (!this.client) {
        return {
          success: false,
          error: {
            code: 'ARCHIVE_FAILED',
            message: 'Matrix client not available'
          }
        }
      }

      const room = this.client.getRoom(roomId)
      if (!room) {
        return {
          success: false,
          error: {
            code: 'ARCHIVE_FAILED',
            message: `Room ${roomId} not found`
          }
        }
      }

      // Get room timeline
      const timeline = room.timeline || []
      const roomName = room.name || 'Unnamed Room'
      const participants = room.getMembers()?.map((member: any) => member.userId) || []

      // Filter messages by timestamp if provided
      let filteredEvents = timeline
      if (startTimestamp || endTimestamp) {
        filteredEvents = timeline.filter((event: MatrixEvent) => {
          const eventTs = event.getTs()
          if (startTimestamp && eventTs < startTimestamp) return false
          if (endTimestamp && eventTs > endTimestamp) return false
          return true
        })
      }

      // Convert Matrix events to archived messages
      const messages: ArchivedChatMessage[] = []
      
      for (const event of filteredEvents) {
        if (event.getType() === 'm.room.message') {
          const content = event.getContent()
          const sender = event.getSender()
          const senderName = room.getMember(sender)?.name || sender
          
          const archivedMessage: ArchivedChatMessage = {
            id: `archived_${event.getId()}`,
            sender,
            senderName,
            content: content.body || '',
            timestamp: event.getTs(),
            messageType: content.msgtype || 'm.text',
            eventId: event.getId() || '',
            isEncrypted: event.isEncrypted() || false,
            decryptedContent: event.isEncrypted() ? content.body : undefined
          }

          messages.push(archivedMessage)
        }
      }

      // Sort messages by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp)

      // Generate encryption key for archive
      const encryptionKey = SimpleEncryption.generateKey()

      // Create archive hash
      const archiveData = {
        roomId,
        roomName,
        participants: participants.sort(), // Sort for consistent hashing
        messages: messages.map(m => ({
          sender: m.sender,
          content: m.content,
          timestamp: m.timestamp,
          eventId: m.eventId
        }))
      }
      
      const archiveHash = await this.generateArchiveHash(archiveData)

      const archive: ChatArchive = {
        roomId,
        roomName,
        participants,
        messageCount: messages.length,
        archiveTimestamp: Date.now(),
        archiveHash,
        encryptionKey,
        messages,
        startTimestamp: messages.length > 0 ? messages[0].timestamp : Date.now(),
        endTimestamp: messages.length > 0 ? messages[messages.length - 1].timestamp : Date.now()
      }

      return { success: true, data: archive }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ARCHIVE_FAILED',
          message: 'Failed to archive room messages',
          details: error
        }
      }
    }
  }

  /**
   * Generate a hash for the chat archive for integrity verification
   */
  private async generateArchiveHash(archiveData: any): Promise<string> {
    try {
      // Create a deterministic string representation
      const dataString = JSON.stringify(archiveData, Object.keys(archiveData).sort())
      
      // Use Web Crypto API to generate hash
      const encoder = new TextEncoder()
      const data = encoder.encode(dataString)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      
      // Convert to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } catch (error) {
      console.error('Hash generation error:', error)
      // Fallback to simple hash
      return this.simpleHash(JSON.stringify(archiveData))
    }
  }

  /**
   * Fallback simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * Verify archive integrity by checking hash
   */
  async verifyArchiveIntegrity(archive: ChatArchive): Promise<boolean> {
    try {
      const archiveData = {
        roomId: archive.roomId,
        roomName: archive.roomName,
        participants: archive.participants.sort(),
        messages: archive.messages.map(m => ({
          sender: m.sender,
          content: m.content,
          timestamp: m.timestamp,
          eventId: m.eventId
        }))
      }
      
      const expectedHash = await this.generateArchiveHash(archiveData)
      return expectedHash === archive.archiveHash
    } catch (error) {
      console.error('Archive verification error:', error)
      return false
    }
  }

  /**
   * Encrypt sensitive message content in archive
   */
  encryptArchive(archive: ChatArchive): ChatArchive {
    if (!archive.encryptionKey) {
      return archive
    }

    const encryptedMessages = archive.messages.map(message => ({
      ...message,
      content: SimpleEncryption.encrypt(message.content, archive.encryptionKey!),
      decryptedContent: message.decryptedContent 
        ? SimpleEncryption.encrypt(message.decryptedContent, archive.encryptionKey!)
        : undefined
    }))

    return {
      ...archive,
      messages: encryptedMessages
    }
  }

  /**
   * Decrypt message content from encrypted archive
   */
  decryptArchive(archive: ChatArchive): ChatArchive {
    if (!archive.encryptionKey) {
      return archive
    }

    const decryptedMessages = archive.messages.map(message => ({
      ...message,
      content: SimpleEncryption.decrypt(message.content, archive.encryptionKey!),
      decryptedContent: message.decryptedContent
        ? SimpleEncryption.decrypt(message.decryptedContent, archive.encryptionKey!)
        : undefined
    }))

    return {
      ...archive,
      messages: decryptedMessages
    }
  }

  /**
   * Archive messages for a specific trade conversation
   */
  async archiveTradeConversation(
    roomId: string,
    tradeStartTime: number,
    tradeEndTime?: number
  ): Promise<TradeHistoryOperationResult<ChatArchive>> {
    // Archive messages from trade start time to end time (or current time)
    const endTime = tradeEndTime || Date.now()
    return this.archiveRoomMessages(roomId, tradeStartTime, endTime)
  }

  /**
   * Create a summary of the archived conversation
   */
  createArchiveSummary(archive: ChatArchive): {
    messageCount: number
    participantCount: number
    timeSpan: string
    messageTypes: Record<string, number>
    topSenders: Array<{ sender: string, count: number }>
  } {
    const messageTypes: Record<string, number> = {}
    const senderCounts: Record<string, number> = {}

    archive.messages.forEach(message => {
      // Count message types
      messageTypes[message.messageType] = (messageTypes[message.messageType] || 0) + 1
      
      // Count messages per sender
      senderCounts[message.sender] = (senderCounts[message.sender] || 0) + 1
    })

    const topSenders = Object.entries(senderCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([sender, count]) => ({ sender, count }))

    const timeSpan = archive.endTimestamp - archive.startTimestamp
    const timeSpanString = this.formatTimeSpan(timeSpan)

    return {
      messageCount: archive.messageCount,
      participantCount: archive.participants.length,
      timeSpan: timeSpanString,
      messageTypes,
      topSenders
    }
  }

  /**
   * Format time span in human readable format
   */
  private formatTimeSpan(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  /**
   * Export archive to different formats
   */
  exportArchive(archive: ChatArchive, format: 'json' | 'txt' | 'csv' = 'json'): string {
    switch (format) {
      case 'txt':
        return this.exportAsText(archive)
      case 'csv':
        return this.exportAsCSV(archive)
      case 'json':
      default:
        return JSON.stringify(archive, null, 2)
    }
  }

  /**
   * Export archive as plain text
   */
  private exportAsText(archive: ChatArchive): string {
    const lines: string[] = []
    lines.push(`Chat Archive: ${archive.roomName}`)
    lines.push(`Room ID: ${archive.roomId}`)
    lines.push(`Archived: ${new Date(archive.archiveTimestamp).toISOString()}`)
    lines.push(`Participants: ${archive.participants.join(', ')}`)
    lines.push(`Messages: ${archive.messageCount}`)
    lines.push(`Hash: ${archive.archiveHash}`)
    lines.push('')
    lines.push('--- MESSAGES ---')
    lines.push('')

    archive.messages.forEach(message => {
      const timestamp = new Date(message.timestamp).toISOString()
      const senderName = message.senderName || message.sender
      lines.push(`[${timestamp}] ${senderName}: ${message.content}`)
    })

    return lines.join('\n')
  }

  /**
   * Export archive as CSV
   */
  private exportAsCSV(archive: ChatArchive): string {
    const lines: string[] = []
    lines.push('timestamp,sender,senderName,messageType,content,eventId')

    archive.messages.forEach(message => {
      const row = [
        message.timestamp.toString(),
        `"${message.sender}"`,
        `"${message.senderName || ''}"`,
        `"${message.messageType}"`,
        `"${message.content.replace(/"/g, '""')}"`,
        `"${message.eventId}"`
      ]
      lines.push(row.join(','))
    })

    return lines.join('\n')
  }
}

// Export factory function
export function createChatArchiveService(client: any): ChatArchiveService {
  return new ChatArchiveService(client)
}
