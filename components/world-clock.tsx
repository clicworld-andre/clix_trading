"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Clock, Globe } from "lucide-react"

// Popular trading cities and their timezones
const WORLD_TIMEZONES = [
  { city: "New York", timezone: "America/New_York", code: "EST/EDT" },
  { city: "London", timezone: "Europe/London", code: "GMT/BST" },
  { city: "Tokyo", timezone: "Asia/Tokyo", code: "JST" },
  { city: "Hong Kong", timezone: "Asia/Hong_Kong", code: "HKT" },
  { city: "Singapore", timezone: "Asia/Singapore", code: "SGT" },
  { city: "Sydney", timezone: "Australia/Sydney", code: "AEDT/AEST" },
  { city: "Frankfurt", timezone: "Europe/Berlin", code: "CET/CEST" },
  { city: "Zurich", timezone: "Europe/Zurich", code: "CET/CEST" },
  { city: "Dubai", timezone: "Asia/Dubai", code: "GST" },
  { city: "Mumbai", timezone: "Asia/Kolkata", code: "IST" },
  { city: "Shanghai", timezone: "Asia/Shanghai", code: "CST" },
  { city: "Toronto", timezone: "America/Toronto", code: "EST/EDT" },
  { city: "São Paulo", timezone: "America/Sao_Paulo", code: "BRT" },
  { city: "Moscow", timezone: "Europe/Moscow", code: "MSK" },
  { city: "Seoul", timezone: "Asia/Seoul", code: "KST" },
]

interface WorldClockProps {
  className?: string
}

export function WorldClock({ className = "" }: WorldClockProps) {
  const [localTime, setLocalTime] = useState("")
  const [worldTime, setWorldTime] = useState("")
  const [selectedTimezone, setSelectedTimezone] = useState(WORLD_TIMEZONES[1]) // Default to London
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const updateTimes = () => {
      const now = new Date()
      
      // Local time (24-hour format)
      setLocalTime(now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }))

      // Selected timezone time
      setWorldTime(now.toLocaleTimeString('en-US', {
        timeZone: selectedTimezone.timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }))
    }
    
    // Update immediately and then every second
    updateTimes()
    const interval = setInterval(updateTimes, 1000)
    
    return () => clearInterval(interval)
  }, [selectedTimezone])

  const handleTimezoneSelect = (timezone: typeof WORLD_TIMEZONES[0]) => {
    setSelectedTimezone(timezone)
    // Save selection to localStorage
    localStorage.setItem('world-clock-timezone', JSON.stringify(timezone))
  }

  // Load saved timezone on mount
  useEffect(() => {
    const savedTimezone = localStorage.getItem('world-clock-timezone')
    if (savedTimezone) {
      try {
        const parsed = JSON.parse(savedTimezone)
        setSelectedTimezone(parsed)
      } catch (error) {
        console.error('Error parsing saved timezone:', error)
      }
    }
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Local Time */}
      <div className="flex flex-col items-end">
        <span className="text-sm font-mono font-semibold">{localTime}</span>
        <span className="text-xs text-muted-foreground">Local</span>
      </div>

      {/* Separator */}
      <div className="w-px h-8 bg-border"></div>

      {/* World Time - Clickable */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex flex-col items-end cursor-pointer hover:opacity-75 transition-opacity">
            <span className="text-sm font-mono font-semibold">{worldTime}</span>
            <span className="text-xs text-muted-foreground">{selectedTimezone.city}</span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Select Timezone
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Major Trading Centers */}
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
            MAJOR TRADING CENTERS
          </DropdownMenuLabel>
          {WORLD_TIMEZONES.slice(0, 6).map((tz) => {
            const time = new Date().toLocaleTimeString('en-US', {
              timeZone: tz.timezone,
              hour12: false,
              hour: '2-digit',
              minute: '2-digit'
            })
            const isSelected = selectedTimezone.timezone === tz.timezone

            return (
              <DropdownMenuItem 
                key={tz.timezone}
                onClick={() => handleTimezoneSelect(tz)}
                className={isSelected ? 'bg-accent' : ''}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col">
                    <span className="font-medium">{tz.city}</span>
                    <span className="text-xs text-muted-foreground">{tz.code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {time}
                    </Badge>
                    {isSelected && (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            )
          })}

          <DropdownMenuSeparator />

          {/* Other Important Cities */}
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
            OTHER FINANCIAL CENTERS
          </DropdownMenuLabel>
          {WORLD_TIMEZONES.slice(6).map((tz) => {
            const time = new Date().toLocaleTimeString('en-US', {
              timeZone: tz.timezone,
              hour12: false,
              hour: '2-digit',
              minute: '2-digit'
            })
            const isSelected = selectedTimezone.timezone === tz.timezone

            return (
              <DropdownMenuItem 
                key={tz.timezone}
                onClick={() => handleTimezoneSelect(tz)}
                className={isSelected ? 'bg-accent' : ''}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col">
                    <span className="font-medium">{tz.city}</span>
                    <span className="text-xs text-muted-foreground">{tz.code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {time}
                    </Badge>
                    {isSelected && (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
