"use client"

import type * as React from "react"
import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DropdownOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface CustomDropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  label?: string
}

export function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className,
  disabled = false,
  label,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedOption = options.find((option) => option.value === value)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <button
        type="button"
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center truncate">
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="flex-shrink-0 mr-2">{selectedOption.icon}</span>}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="flex-shrink-0 h-4 w-4 opacity-50 ml-2" />
      </button>

      {isOpen && (
        <div
          className="absolute z-[9999] mt-1 w-full rounded-md border border-input bg-popover shadow-lg"
          style={{ maxHeight: "300px", overflowY: "auto",zIndex: 9999, backgroundColor: "white" }}
        >
          <ul className="py-1" role="listbox">
            {options.map((option) => (
              <li
                key={option.value}
                className={cn(
                  "relative flex cursor-pointer select-none items-center px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  option.value === value && "bg-accent/50",
                )}
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
              >
                <div className="flex items-center w-full pr-6">
                  {option.icon && <span className="flex-shrink-0 mr-2">{option.icon}</span>}
                  <span className="truncate">{option.label}</span>
                </div>
                {option.value === value && (
                  <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
