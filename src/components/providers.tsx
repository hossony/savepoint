"use client";

import { ThemeProvider } from "next-themes";
import { ToastProvider } from "./ui/toast";
import { ReviewComposerProvider } from "./review-composer";

export function Providers({ children, isAuthed }: { children: React.ReactNode; isAuthed: boolean }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ToastProvider>
        <ReviewComposerProvider isAuthed={isAuthed}>{children}</ReviewComposerProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
