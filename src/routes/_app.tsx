import { createFileRoute, Navigate, Outlet, useRouterState, Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/agenda": "Agenda",
  "/pacientes": "Pacientes",
  "/profissionais": "Profissionais",
  "/relatorios": "Relatórios",
  "/diretoria": "Diretoria",
};

function AppLayout() {
  const { session, loading } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">Carregando…</div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;

  const title =
    Object.entries(titles).find(([k]) => path === k || path.startsWith(k + "/"))?.[1] ?? "";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <h1 className="text-base font-semibold">{title}</h1>
            <div className="ml-auto flex items-center gap-2">
              <Button asChild size="sm" className="gap-1.5">
                <Link to="/agenda">
                  <Calendar className="h-4 w-4" /> Acessar Agenda
                </Link>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
