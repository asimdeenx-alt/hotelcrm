import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: { default: "Hotel CRM", template: "%s · Hotel CRM" },
  description: "Hotel management CRM — reservations, guests, rooms, housekeeping and billing.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster richColors position="top-right" theme="light" />
      </body>
    </html>
  );
}
