"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMatrixClient } from "@/lib/matrix-context"
import { useToast } from "@/hooks/use-toast"
import { Search, UserPlus, X } from "lucide-react"

interface UserSearchProps {
  onStartChat: (roomId: string) => void
  onClose: () => void
}

interface UserResult {
  userId: string
  displayName?: string
  avatarUrl?: string
}

export default function UserSearch({ onStartChat, onClose }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const { client } = useMatrixClient()
  const { toast } = useToast()

  const handleSearch = async () => {
    if (!searchQuery.trim() || !client) return

    setIsSearching(true)
    setSearchResults([])

    try {
      // Search for users using the Matrix API
      const searchTerm = searchQuery.trim()

      // If the search term looks like a Matrix ID, use it directly
      if (searchTerm.startsWith("@") && searchTerm.includes(":")) {
        // Try to get profile info for this user ID
        try {
          const profile = await (client as any).getProfileInfo(searchTerm)
          setSearchResults([
            {
              userId: searchTerm,
              displayName: profile.displayname,
              avatarUrl: profile.avatar_url,
            },
          ])
        } catch (error) {
          console.error("Error fetching profile:", error)
          // Still add the user ID even if profile fetch fails
          setSearchResults([{ userId: searchTerm }])
        }
      } else {
        // For demo purposes, we'll use the user directory search if available
        try {
          // Try to use the user directory search API if available
          const searchResults = await (client as any).searchUserDirectory({
            term: searchTerm,
            limit: 20,
          })

          if (searchResults && searchResults.results && searchResults.results.length > 0) {
            const formattedResults = searchResults.results.map((user: any) => ({
              userId: user.user_id,
              displayName: user.display_name,
              avatarUrl: user.avatar_url,
            }))

            setSearchResults(formattedResults)
          } else {
            // Fallback to creating some sample results with different domains
            createSampleResults(searchTerm)
          }
        } catch (error) {
          console.error("Error searching user directory:", error)
          // Fallback to creating some sample results
          createSampleResults(searchTerm)
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

  // Helper function to create sample results with different domains
  const createSampleResults = (searchTerm: string) => {
    // Get the homeserver domain from the client
    const homeserverUrl = client ? (client as any).getHomeserverUrl() : ""
    let domain = "matrix.org" // Default fallback

    try {
      domain = new URL(homeserverUrl).hostname
    } catch (error) {
      console.error("Error parsing homeserver URL:", error)
    }

    // Create sample results with different domains
    const results: UserResult[] = [
      {
        userId: `@${searchTerm}:${domain}`,
        displayName: `${searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1)}`,
      },
    ]

    // Add some other common Matrix servers for variety
    if (domain !== "matrix.org") {
      results.push({
        userId: `@${searchTerm}:matrix.org`,
        displayName: `${searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1)} (matrix.org)`,
      })
    }

    setSearchResults(results)
  }

  // Completely revised handleStartChat function to fix room creation issues
  const handleStartChat = async (userId: string) => {
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
      // Ensure userId is properly formatted
      if (!userId.startsWith("@")) {
        userId = `@${userId}`
      }

      if (!userId.includes(":")) {
        // Get domain from homeserver URL
        let domain = "matrix.org"
        try {
          domain = new URL((client as any).getHomeserverUrl()).hostname
        } catch (error) {
          console.error("Error parsing homeserver URL:", error)
        }
        userId = `${userId}:${domain}`
      }

      console.log("Starting chat with user:", userId)

      // Check if we already have a direct message room with this user
      const existingRooms = (client as any).getRooms()
      let existingDirectRoom = null

      for (const room of existingRooms) {
        try {
          // Check if this is a direct message room with the target user
          const isDM =
            room.getJoinRule() === "invite" && room.getInvitedAndJoinedMemberCount() === 2 && room.getMember(userId)

          if (isDM) {
            existingDirectRoom = room.roomId
            console.log("Found existing DM room:", existingDirectRoom)
            break
          }
        } catch (error) {
          console.error("Error checking room:", error)
          // Continue to next room if there's an error
          continue
        }
      }

      if (existingDirectRoom) {
        // Use existing room
        toast({
          title: "Chat opened",
          description: `Opened existing chat with ${userId.split(":")[0]}`,
        })

        console.log("About to call onStartChat with existing room:", existingDirectRoom)
        if (typeof onStartChat === 'function') {
          onStartChat(existingDirectRoom)
        } else {
          console.error("onStartChat is not a function for existing room:", onStartChat)
        }
        onClose()
        return
      }

      // Extract username for room name
      const username = userId.split(":")[0].replace("@", "")

      // Create a direct message room with the selected user
      console.log("Creating new room with user:", userId)

      // Check if createRoom is available
      if (!(client as any).createRoom) {
        throw new Error("Room creation not supported by this client")
      }

      // Use a more basic room creation approach
      const createRoomResponse = await (client as any).createRoom({
        preset: "private_chat",
        invite: [userId],
        is_direct: true,
        visibility: "private",
        name: `Chat with ${username}`,
      })

      console.log("Room creation response:", createRoomResponse)

      if (!createRoomResponse || !createRoomResponse.room_id) {
        throw new Error("Failed to create room: No room ID returned")
      }

      const roomId = createRoomResponse.room_id

      // Set the room as a direct message
      try {
        // Get current direct message mapping
        const directEvent = await (client as any).getAccountData("m.direct")
        const directContent = directEvent ? directEvent.getContent() : {}

        // Add this room to the direct message mapping
        if (!directContent[userId]) {
          directContent[userId] = []
        }

        if (!directContent[userId].includes(roomId)) {
          directContent[userId].push(roomId)
          await (client as any).setAccountData("m.direct", directContent)
        }
      } catch (error) {
        console.error("Error setting direct message flag:", error)
        // Continue even if this fails
      }

      toast({
        title: "Chat created",
        description: `Started a new chat with ${username}`,
      })

      // Notify parent component to switch to this room
      console.log("About to call onStartChat with roomId:", roomId)
      console.log("onStartChat function type:", typeof onStartChat)
      if (typeof onStartChat === 'function') {
        onStartChat(roomId)
      } else {
        console.error("onStartChat is not a function in user-search:", onStartChat)
      }
      onClose()
    } catch (error) {
      console.error("Error creating chat:", error)
      toast({
        title: "Failed to start chat",
        description:
          error instanceof Error ? error.message : "Could not create a chat with this user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingRoom(false)
    }
  }

  // Get initials from user ID or display name
  const getInitials = (user: UserResult) => {
    if (user.displayName) {
      return user.displayName
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    }

    // If no display name, use first character of user ID (without @)
    return user.userId.replace("@", "")[0].toUpperCase()
  }

  // Format user ID for display
  const formatUserId = (userId: string) => {
    // If it's a Matrix ID, show it in a more readable format
    if (userId.startsWith("@") && userId.includes(":")) {
      const [username, domain] = userId.substring(1).split(":")
      return `${username} (${domain})`
    }
    return userId
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-lg">Find Users</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex space-x-2 mb-4">
        <Input
          placeholder="Search by username or Matrix ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></span>
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 custom-scrollbar">
        <div className="space-y-2">
          {searchResults.length > 0 ? (
            searchResults.map((user) => (
              <div
                key={user.userId}
                className="flex items-center justify-between p-3 rounded-md hover:bg-accent cursor-pointer"
                onClick={() => !isCreatingRoom && handleStartChat(user.userId)}
              >
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={user.avatarUrl} alt={user.displayName || user.userId} />
                    <AvatarFallback>{getInitials(user)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.displayName || user.userId.split(":")[0].substring(1)}</div>
                    <div className="text-xs text-muted-foreground">{formatUserId(user.userId)}</div>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="ml-2" disabled={isCreatingRoom}>
                  {isCreatingRoom ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent mr-1"></span>
                  ) : (
                    <UserPlus className="h-4 w-4 mr-1" />
                  )}
                  Chat
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {isSearching ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
                  <p>Searching...</p>
                </div>
              ) : searchQuery ? (
                <p>No users found. Try a different search term.</p>
              ) : (
                <p>Search for users to start a chat</p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="mt-4">
        <p className="text-xs text-muted-foreground">
          Tip: You can search by username or enter a full Matrix ID (e.g., @user:matrix.org)
        </p>
      </div>
    </div>
  )
}
