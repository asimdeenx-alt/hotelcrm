"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  const { theme: systemTheme = "system" } = useTheme();
  const { theme, ...rest } = props;

  return (
    <Sonner
      theme={theme ?? systemTheme}
      className="toaster group"
      style={{
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
      }}
      {...rest}
    />
  );
};

export { Toaster };
