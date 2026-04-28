import { DashboardNavbar } from "@/components/dashboard/navbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardNavbar />
      <div className="flex h-full flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
