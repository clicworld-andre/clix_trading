"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import {
  MessageCircle,
  Search,
  Download,
  Shield,
  Calendar,
  Users,
  Hash,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Filter,
  SortDesc
} from "lucide-react"

import {
  ChatArchive,
  ArchivedChatMessage,
  TradeRecord
} from "@/lib/trade-history-types"

interface ChatArchiveViewerProps {
  archive: ChatArchive
  trade?: TradeRecord
  className?: string
}

export default function ChatArchiveViewer({
  archive,
  trade,
  className = ""
}: ChatArchiveViewerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMessageType, setSelectedMessageType] = useState<string>("all")
  const [selectedSender, setSelectedSender] = useState<string>("all")
  const [showEncrypted, setShowEncrypted] = useState(false)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const { toast } = useToast()

  // Filter and sort messages
  const filteredMessages = useMemo(() => {
    let messages = [...archive.messages]

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      messages = messages.filter(msg => 
        msg.content.toLowerCase().includes(searchLower) ||
        msg.senderName?.toLowerCase().includes(searchLower) ||
        msg.sender.toLowerCase().includes(searchLower)
      )
    }

    // Apply message type filter
    if (selectedMessageType !== "all") {
      messages = messages.filter(msg => msg.messageType === selectedMessageType)
    }

    // Apply sender filter
    if (selectedSender !== "all") {
      messages = messages.filter(msg => msg.sender === selectedSender)
    }

    // Sort messages
    messages.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.timestamp - b.timestamp
      } else {
        return b.timestamp - a.timestamp
      }
    })

    return messages
  }, [archive.messages, searchTerm, selectedMessageType, selectedSender, sortOrder])

  // Get unique senders and message types for filters
  const uniqueSenders = useMemo(() => {
    const senders = new Set<string>()
    archive.messages.forEach(msg => senders.add(msg.sender))
    return Array.from(senders)
  }, [archive.messages])

  const uniqueMessageTypes = useMemo(() => {
    const types = new Set<string>()
    archive.messages.forEach(msg => types.add(msg.messageType))
    return Array.from(types)
  }, [archive.messages])

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDuration = (startTime: number, endTime: number) => {
    const duration = endTime - startTime
    const hours = Math.floor(duration / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'm.text':
        return 'bg-blue-100 text-blue-800'
      case 'm.notice':
        return 'bg-yellow-100 text-yellow-800'
      case 'm.image':
        return 'bg-green-100 text-green-800'
      case 'm.file':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied to clipboard",
        description: "Text has been copied to your clipboard"
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      })
    }
  }

  const exportArchive = () => {
    const exportData = {
      roomName: archive.roomName,
      roomId: archive.roomId,
      archiveDate: new Date(archive.archiveTimestamp).toISOString(),
      participants: archive.participants,
      messageCount: archive.messageCount,
      messages: filteredMessages.map(msg => ({
        timestamp: formatTimestamp(msg.timestamp),
        sender: msg.senderName || msg.sender,
        type: msg.messageType,
        content: msg.content
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-archive-${archive.roomId.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Archive exported",
      description: "Chat archive has been downloaded as JSON"
    })
  }

  return (
    <div className={`flex flex-col h-full space-y-4 ${className}`}>
      {/* Archive Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chat Archive
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportArchive}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Archive Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {archive.messageCount}
              </div>
              <div className="text-xs text-muted-foreground">Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {archive.participants.length}
              </div>
              <div className="text-xs text-muted-foreground">Participants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {formatDuration(archive.startTimestamp, archive.endTimestamp)}
              </div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600 flex items-center justify-center gap-1">
                <Shield className="h-4 w-4" />
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="text-xs text-muted-foreground">Verified</div>
            </div>
          </div>

          {/* Archive Details */}
          <div className="space-y-2 pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Room:</span>
              <span className="font-mono text-xs">{archive.roomName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Archived:</span>
              <span>{formatTimestamp(archive.archiveTimestamp)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Time Range:</span>
              <span>
                {formatTimestamp(archive.startTimestamp)} - {formatTimestamp(archive.endTimestamp)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Hash className="h-3 w-3" />
                Hash:
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs truncate max-w-32">
                  {archive.archiveHash}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(archive.archiveHash)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Message Type Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Type:</label>
                <select
                  value={selectedMessageType}
                  onChange={(e) => setSelectedMessageType(e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="all">All Types</option>
                  {uniqueMessageTypes.map(type => (
                    <option key={type} value={type}>
                      {type.replace('m.', '')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sender Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Sender:</label>
                <select
                  value={selectedSender}
                  onChange={(e) => setSelectedSender(e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="all">All Senders</option>
                  {uniqueSenders.map(sender => (
                    <option key={sender} value={sender}>
                      {sender.split(':')[0].replace('@', '')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Order */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-2"
              >
                <SortDesc className="h-4 w-4" />
                {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
              </Button>

              {/* Show Encrypted Toggle */}
              {archive.encryptionKey && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEncrypted(!showEncrypted)}
                  className="flex items-center gap-2"
                >
                  {showEncrypted ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Hide Raw
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Show Raw
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Results Counter */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredMessages.length} of {archive.messageCount} messages
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <div className="flex-1 overflow-hidden">
        <Card className="h-full">
          <CardContent className="p-0 h-full">
            <div className="h-full overflow-y-auto">
              {filteredMessages.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mr-2" />
                  No messages match your filters
                </div>
              ) : (
                <div className="space-y-1 p-4">
                  {filteredMessages.map((message, index) => (
                    <div
                      key={`${message.id}-${index}`}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      {/* Avatar */}
                      <Avatar className="h-8 w-8 mt-0.5">
                        <AvatarFallback className="text-xs">
                          {getInitials(message.senderName || message.sender.split(':')[0].replace('@', ''))}
                        </AvatarFallback>
                      </Avatar>

                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        {/* Message Header */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm truncate">
                            {message.senderName || message.sender.split(':')[0].replace('@', '')}
                          </span>
                          <Badge
                            className={`text-xs ${getMessageTypeColor(message.messageType)}`}
                          >
                            {message.messageType.replace('m.', '')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>

                        {/* Message Body */}
                        <div className="text-sm">
                          {message.isEncrypted && showEncrypted ? (
                            <div className="space-y-2">
                              <div className="font-mono text-xs bg-muted p-2 rounded border-l-2 border-yellow-500">
                                <div className="text-yellow-600 mb-1">Encrypted:</div>
                                {message.content}
                              </div>
                              {message.decryptedContent && (
                                <div className="font-mono text-xs bg-muted p-2 rounded border-l-2 border-green-500">
                                  <div className="text-green-600 mb-1">Decrypted:</div>
                                  {message.decryptedContent}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap break-words">
                              {message.content}
                            </div>
                          )}
                        </div>

                        {/* Message Metadata */}
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>ID: {message.eventId}</span>
                          {message.isEncrypted && (
                            <Badge variant="outline" className="text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              Encrypted
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Message Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          onClick={() => copyToClipboard(message.content)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
