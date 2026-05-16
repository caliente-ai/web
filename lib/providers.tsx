"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { CacheProvider } from "@emotion/react";
import { useState, type ReactNode } from "react";
import { theme } from "./theme";
import { createEmotionCache } from "./emotion-cache";
import { ToastProvider } from "./toast";
import { CommandPaletteProvider } from "./command-palette";

export function Providers({ children }: { children: ReactNode }) {
  const [cache] = useState(() => createEmotionCache());
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
      })
  );
  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={client}>
          <ToastProvider>
            <CommandPaletteProvider>{children}</CommandPaletteProvider>
          </ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </CacheProvider>
  );
}
