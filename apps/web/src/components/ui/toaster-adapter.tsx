"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export function ToasterAdapter(): React.ReactElement {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("dark");

  useEffect(() => {
    function sync(): void {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    }
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <Toaster
      theme={theme}
      richColors
      closeButton
      position="bottom-right"
      toastOptions={{
        style: { fontFamily: "var(--font-jakarta), sans-serif" },
      }}
    />
  );
}
