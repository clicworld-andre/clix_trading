import { Inter } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { MatrixClientProvider } from "@/lib/matrix-context"
import { CallContextProvider } from "@/lib/call-context"
import { SiteHeader } from "@/components/site-header"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Trade Finance Platform",
  description: "Secure digital trade finance platform powered by blockchain technology",
  icons: {
    icon: "/clix_token_new_01.svg",
    apple: "/clix_token_new_01.svg",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, "min-h-screen bg-background")} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="clix-theme">
          <MatrixClientProvider>
            <CallContextProvider>
              {children}
              <Toaster />
            </CallContextProvider>
          </MatrixClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
