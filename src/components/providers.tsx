"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { Toaster } from "sonner"
import { PreferencesProvider, usePreferences } from "@/features/preferences/preferences-provider"

function ThemedToaster() {
  const { resolvedTheme } = usePreferences()
  return <Toaster position="top-center" richColors theme={resolvedTheme} />
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff max 30s
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <PreferencesProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <ThemedToaster />
      </QueryClientProvider>
    </PreferencesProvider>
  )
}
