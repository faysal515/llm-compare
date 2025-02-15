import {
  Sidebar,
  SidebarContent,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Settings, Play } from "lucide-react";
import { useRouter } from "next/router";

export function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar>
        <SidebarContent>
          <SidebarMenu className="p-2">
            <SidebarMenuItem className="mb-1">
              <SidebarMenuButton
                onClick={() => router.push("/")}
                isActive={router.pathname === "/"}
                tooltip="Playground"
              >
                <Play className="h-4 w-4" />
                <span>Playground</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push("/settings")}
                isActive={router.pathname === "/settings"}
                tooltip="Settings"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <div className="flex flex-1 flex-col">
        <div className="border-b px-4 py-2">
          <SidebarTrigger />
        </div>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
