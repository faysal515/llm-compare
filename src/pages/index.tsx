import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/ui/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Playground</h1>
    </div>
  );
}
