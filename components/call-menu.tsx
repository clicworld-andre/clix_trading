"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMatrixClient } from "@/lib/matrix-context"
import { useMatrixCalls } from "@/lib/call-context"
import { useToast } from "@/hooks/use-toast"
import { Phone, Search, Users, UserPlus, Clock, PhoneCall, User } from "lucide-react"

interface CallMenuProps {
  onClose: () => void
}

interface Contact {
  userId: string
  displayName: string
  avatar?: string
  roomId?: string
  isOnline: boolean
  lastSeen?: number
}

interface UserResult {
  userId: string
  displayName?: string
  avatarUrl?: string
}

export default function CallMenu({ onClose }: CallMenuProps) {
  const { client } = useMatrixClient()
  const { startCall } = useMatrixCalls()
  const { toast } = useToast()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [recentCalls, setRecentCalls] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("contacts")
  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)

  useEffect(() => {
    if (!client) return

    // Get contacts from joined rooms
    const rooms = client.getRooms()
    const contactsMap = new Map<string, Contact>()

    rooms.forEach((room: any) => {
      const members = room.getJoinedMembers()
      const currentUserId = client.getUserId()

      members.forEach((member: any) => {
        if (member.userId !== currentUserId) {
          let displayName = member.name || member.userId
          if (displayName.startsWith("@") && displayName.includes(":")) {
            displayName = displayName.split(":")[0].substring(1)
          }

          let avatar: string | undefined = undefined
          if (member.getAvatarUrl() && client.mxcUrlToHttp) {
            try {
              const avatarMxcUrl = member.getAvatarUrl()
              if (avatarMxcUrl && avatarMxcUrl.startsWith('mxc://')) {
                // Check if client has proper baseUrl configured
                const baseUrl = (client as any).baseUrl || (client as any).getHomeserverUrl?.()
                if (baseUrl && baseUrl !== 'undefined') {
                  avatar = client.mxcUrlToHttp(avatarMxcUrl, 40, 40, "scale", true) || undefined
                  console.log('CallMenu: Generated avatar URL for contact:', member.userId, avatar)
                } else {
                  console.warn('CallMenu: No valid homeserver URL for avatar generation for:', member.userId)
                }
              }
            } catch (error) {
              console.warn('CallMenu: Failed to generate avatar URL for:', member.userId, error)
            }
          }

          // Only add if not already in contacts or if this room is a better match (DM)
          const existing = contactsMap.get(member.userId)
          if (!existing || room.getDMInviter()) {
            contactsMap.set(member.userId, {
              userId: member.userId,
              displayName,
              avatar,
              roomId: room.roomId,
              isOnline: Math.random() > 0.5, // Simulate online status
              lastSeen: Date.now() - Math.random() * 24 * 60 * 60 * 1000, // Random last seen within 24h
            })
          }
        }
      })
    })

    setContacts(Array.from(contactsMap.values()))

    // Simulate recent calls data
    const mockRecentCalls = [
      {
        userId: "@alice:matrix.org",
        displayName: "Alice Johnson",
        type: "outgoing",
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        duration: 420, // 7 minutes
      },
      {
        userId: "@bob:matrix.org", 
        displayName: "Bob Wilson",
        type: "incoming",
        timestamp: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
        duration: 180, // 3 minutes
      },
      {
        userId: "@carol:matrix.org",
        displayName: "Carol Davis",
        type: "missed",
        timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
        duration: 0,
      },
    ]
    setRecentCalls(mockRecentCalls)
  }, [client])

  const filteredContacts = contacts.filter(contact =>
    contact.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.userId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCall = async (contact: Contact) => {
    if (contact.roomId) {
      await startCall(contact.roomId, contact.userId)
      onClose()
    }
  }

  // Enhanced search function for finding new users
  const handleUserSearch = async () => {
    if (!searchTerm.trim() || !client) return

    setIsSearching(true)
    setSearchResults([])

    try {
      const searchQuery = searchTerm.trim()

      // If the search term looks like a Matrix ID, use it directly
      if (searchQuery.startsWith("@") && searchQuery.includes(":")) {
        try {
          const profile = await (client as any).getProfileInfo(searchQuery)
          
          let avatarUrl: string | undefined = undefined
          // Safely convert MXC avatar URL to HTTP URL
          if (profile.avatar_url && profile.avatar_url.startsWith('mxc://') && client.mxcUrlToHttp) {
            try {
              const baseUrl = (client as any).baseUrl || (client as any).getHomeserverUrl?.()
              if (baseUrl && baseUrl !== 'undefined') {
                avatarUrl = client.mxcUrlToHttp(profile.avatar_url, 40, 40, "scale", true) || undefined
                console.log('CallMenu: Generated direct profile avatar URL for:', searchQuery, avatarUrl)
              } else {
                console.warn('CallMenu: No valid homeserver URL for direct profile avatar generation for:', searchQuery)
              }
            } catch (error) {
              console.warn('CallMenu: Failed to generate direct profile avatar URL for:', searchQuery, error)
            }
          }
          
          setSearchResults([
            {
              userId: searchQuery,
              displayName: profile.displayname,
              avatarUrl: avatarUrl,
            },
          ])
        } catch (error) {
          console.error("Error fetching profile:", error)
          setSearchResults([{ userId: searchQuery }])
        }
      } else {
        // Try user directory search
        try {
          const searchResults = await (client as any).searchUserDirectory({
            term: searchQuery,
            limit: 10,
          })

          if (searchResults && searchResults.results && searchResults.results.length > 0) {
            const formattedResults = searchResults.results.map((user: any) => {
              let avatarUrl: string | undefined = undefined
              
              // Safely convert MXC avatar URL to HTTP URL
              if (user.avatar_url && user.avatar_url.startsWith('mxc://') && client.mxcUrlToHttp) {
                try {
                  const baseUrl = (client as any).baseUrl || (client as any).getHomeserverUrl?.()
                  if (baseUrl && baseUrl !== 'undefined') {
                    avatarUrl = client.mxcUrlToHttp(user.avatar_url, 40, 40, "scale", true) || undefined
                    console.log('CallMenu: Generated search result avatar URL for:', user.user_id, avatarUrl)
                  } else {
                    console.warn('CallMenu: No valid homeserver URL for search result avatar generation for:', user.user_id)
                  }
                } catch (error) {
                  console.warn('CallMenu: Failed to generate search result avatar URL for:', user.user_id, error)
                }
              }
              
              return {
                userId: user.user_id,
                displayName: user.display_name,
                avatarUrl: avatarUrl,
              }
            })
            setSearchResults(formattedResults)
          } else {
            createSampleSearchResults(searchQuery)
          }
        } catch (error) {
          console.error("Error searching user directory:", error)
          createSampleSearchResults(searchQuery)
        }
      }
    } catch (error) {
      console.error("Search error:", error)
      toast({
        title: "Search failed",
        description: "Failed to search for users. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Helper function to create sample search results
  const createSampleSearchResults = (searchQuery: string) => {
    const homeserverUrl = (client as any)?.getHomeserverUrl() || ""
    let domain = "matrix.org"

    try {
      domain = new URL(homeserverUrl).hostname
    } catch (error) {
      console.error("Error parsing homeserver URL:", error)
    }

    const results: UserResult[] = [
      {
        userId: `@${searchQuery}:${domain}`,
        displayName: `${searchQuery.charAt(0).toUpperCase() + searchQuery.slice(1)}`,
      },
    ]

    if (domain !== "matrix.org") {
      results.push({
        userId: `@${searchQuery}:matrix.org`,
        displayName: `${searchQuery.charAt(0).toUpperCase() + searchQuery.slice(1)} (matrix.org)`,
      })
    }

    setSearchResults(results)
  }

  // Call a user by creating or finding a room first
  const handleCallUser = async (user: UserResult) => {
    if (!client) {
      toast({
        title: "Error",
        description: "Matrix client not initialized",
        variant: "destructive",
      })
      return
    }

    setIsCreatingRoom(true)

    try {
      let userId = user.userId
      
      // Ensure userId is properly formatted
      if (!userId.startsWith("@")) {
        userId = `@${userId}`
      }
      if (!userId.includes(":")) {
        let domain = "matrix.org"
        try {
          domain = new URL((client as any).getHomeserverUrl()).hostname
        } catch (error) {
          console.error("Error parsing homeserver URL:", error)
        }
        userId = `${userId}:${domain}`
      }

      console.log("Preparing to call user:", userId)

      // Check if we already have a direct message room with this user
      const existingRooms = client.getRooms()
      let existingDirectRoom = null

      for (const room of existingRooms) {
        try {
          const isDM =
            room.getJoinRule() === "invite" && 
            room.getInvitedAndJoinedMemberCount() === 2 && 
            room.getMember(userId)

          if (isDM) {
            existingDirectRoom = room.roomId
            console.log("Found existing DM room:", existingDirectRoom)
            break
          }
        } catch (error) {
          console.error("Error checking room:", error)
          continue
        }
      }

      let roomId = existingDirectRoom

      if (!existingDirectRoom) {
        // Create a direct message room with the selected user
        console.log("Creating new room for call with user:", userId)

        const username = userId.split(":")[0].replace("@", "")
        const createRoomResponse = await (client as any).createRoom({
          preset: "private_chat",
          invite: [userId],
          is_direct: true,
          visibility: "private",
          name: `Call with ${username}`,
        })

        if (!createRoomResponse || !createRoomResponse.room_id) {
          throw new Error("Failed to create room: No room ID returned")
        }

        roomId = createRoomResponse.room_id

        // Set the room as a direct message
        try {
          const directEvent = await (client as any).getAccountData("m.direct")
          const directContent = directEvent ? directEvent.getContent() : {}

          if (!directContent[userId]) {
            directContent[userId] = []
          }

          if (!directContent[userId].includes(roomId)) {
            directContent[userId].push(roomId)
            await (client as any).setAccountData("m.direct", directContent)
          }
        } catch (error) {
          console.error("Error setting direct message flag:", error)
        }

        toast({
          title: "Room created",
          description: `Created chat room for call with ${user.displayName || username}`,
        })
      }

      // Now start the call
      if (roomId) {
        await startCall(roomId, userId)
        toast({
          title: "Call initiated",
          description: `Calling ${user.displayName || userId.split(":")[0]}...`,
        })
        onClose()
      }

    } catch (error) {
      console.error("Error calling user:", error)
      toast({
        title: "Failed to start call",
        description: error instanceof Error ? error.message : "Could not start the call. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingRoom(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const formatTimestamp = (timestamp: number) => {
    const now = new Date()
    const date = new Date(timestamp)
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return "< 1h ago"
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return "Yesterday"
    return date.toLocaleDateString()
  }

  return (
    <Card className="w-80 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Make a Call
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === "contacts" ? "Search contacts..." : "Search users to call..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && activeTab === "search" && handleUserSearch()}
              className="pl-10"
            />
          </div>
          {activeTab === "search" && (
            <Button onClick={handleUserSearch} disabled={isSearching} size="sm">
              {isSearching ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></span>
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="contacts" className="text-xs">
              <Users className="h-4 w-4 mr-1" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="search" className="text-xs">
              <User className="h-4 w-4 mr-1" />
              Find Users
            </TabsTrigger>
            <TabsTrigger value="recent" className="text-xs">
              <Clock className="h-4 w-4 mr-1" />
              Recent
            </TabsTrigger>
          </TabsList>

        {/* Content */}
        <ScrollArea className="h-64">
          <TabsContent value="contacts" className="space-y-2 mt-0">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <div key={contact.userId} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={contact.avatar} />
                        <AvatarFallback className="text-xs">
                          {contact.displayName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {contact.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contact.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.isOnline ? "Online" : `Last seen ${formatTimestamp(contact.lastSeen || 0)}`}
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => handleCall(contact)}
                    className="h-8 w-8"
                  >
                    <PhoneCall className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? "No contacts found" : "No contacts available"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Join a chat room to see contacts or search for new users
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="search" className="space-y-2 mt-0">
            {searchResults.length > 0 ? (
              searchResults.map((user) => {
                const getInitials = (name: string) => {
                  if (user.displayName) {
                    return user.displayName
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()
                      .substring(0, 2)
                  }
                  return user.userId.replace("@", "")[0].toUpperCase()
                }
                
                const formatUserId = (userId: string) => {
                  if (userId.startsWith("@") && userId.includes(":")) {
                    const [username, domain] = userId.substring(1).split(":")
                    return `${username} (${domain})`
                  }
                  return userId
                }
                
                return (
                  <div key={user.userId} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.displayName || user.userId)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.displayName || user.userId.split(":")[0].substring(1)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatUserId(user.userId)}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => handleCallUser(user)}
                      disabled={isCreatingRoom}
                      className="h-8 w-8"
                    >
                      {isCreatingRoom ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent"></span>
                      ) : (
                        <PhoneCall className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                {isSearching ? (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
                    <p className="text-sm text-muted-foreground">Searching...</p>
                  </div>
                ) : searchTerm ? (
                  <p className="text-sm text-muted-foreground">No users found. Try a different search term.</p>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Search for users to call</p>
                    <p className="text-xs text-muted-foreground">Enter a username or Matrix ID (e.g., @user:matrix.org)</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="recent" className="space-y-2 mt-0">
            {recentCalls.length > 0 ? (
              recentCalls.map((call, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {call.displayName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{call.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {call.type === 'missed' ? '📞 Missed' : 
                         call.type === 'incoming' ? '📞 Incoming' : '📞 Outgoing'} • 
                        {formatTimestamp(call.timestamp)}
                        {call.duration > 0 && ` • ${formatDuration(call.duration)}`}
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => {
                      // For recent calls, we need to find or create a room
                      handleCallUser({ userId: call.userId, displayName: call.displayName })
                    }}
                    className="h-8 w-8"
                  >
                    <PhoneCall className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No recent calls</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your call history will appear here
                </p>
              </div>
            )}
          </TabsContent>
        </ScrollArea>
        </Tabs>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}