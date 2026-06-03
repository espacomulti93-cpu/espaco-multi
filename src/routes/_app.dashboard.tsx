import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Stethoscope, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

const statusColors: Record<string, string> = {
  confirmado: "bg-success/15 text-success",
  pendente: "bg-warning/20 text-warning-foreground",
  cancelado: "bg-destructive/15 text-destructive",
  realizado: "bg-primary/15 text-primary",
  falta: "bg-muted text-muted-foreground",
};

function Dashboard() {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const { data: agHoje = [] } = useQuery({
    queryKey: ["ag-hoje"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*, pacientes(nome), profissionais(nome, cor), servicos(nome)")
        .gte("data_inicio", startOfDay)
        .lte("data_inicio", endOfDay)
        .order("data_inicio");
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [pac, prof, ag] = await Promise.all([
        supabase
          .from("pacientes")
          .select("id", { count: "exact", head: true })
          .eq("status", "ativo"),
        supabase
          .from("profissionais")
          .select("id", { count: "exact", head: true })
          .eq("ativo", true),
        supabase
          .from("agendamentos")
          .select("status", { count: "exact" })
          .gte("data_inicio", startOfDay)
          .lte("data_inicio", endOfDay),
      ]);
      const ags = ag.data ?? [];
      return {
        pacientes: pac.count ?? 0,
        profissionais: prof.count ?? 0,
        agendamentosHoje: ags.length,
        realizados: ags.filter((a) => a.status === "realizado").length,
        faltas: ags.filter((a) => a.status === "falta").length,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
        <h2 className="text-2xl font-semibold">Visão geral</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Calendar}
          label="Agendamentos hoje"
          value={stats?.agendamentosHoje ?? 0}
          tone="primary"
        />
        <StatCard
          icon={CheckCircle2}
          label="Realizados"
          value={stats?.realizados ?? 0}
          tone="success"
        />
        <StatCard icon={XCircle} label="Faltas" value={stats?.faltas ?? 0} tone="destructive" />
        <StatCard
          icon={Users}
          label="Pacientes ativos"
          value={stats?.pacientes ?? 0}
          tone="accent"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Agendamentos de hoje</CardTitle>
          <Link to="/agenda" className="text-sm text-primary hover:underline">
            Ver agenda completa
          </Link>
        </CardHeader>
        <CardContent>
          {agHoje.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Clock className="mx-auto mb-2 h-6 w-6 opacity-50" />
              Nenhum agendamento para hoje.
            </div>
          ) : (
            <div className="divide-y">
              {agHoje.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 py-3">
                  <div
                    className="h-10 w-1 rounded-full"
                    style={{ background: a.profissionais?.cor ?? "var(--primary)" }}
                  />
                  <div className="min-w-[80px] text-sm font-medium">
                    {format(new Date(a.data_inicio), "HH:mm")} –{" "}
                    {format(new Date(a.data_fim), "HH:mm")}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{a.pacientes?.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.servicos?.nome} • {a.profissionais?.nome}
                    </div>
                  </div>
                  <Badge className={statusColors[a.status] ?? ""} variant="secondary">
                    {a.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <QuickLink
          to="/pacientes"
          icon={Users}
          title="Gerenciar pacientes"
          desc="Cadastros, responsáveis e histórico"
        />
        <QuickLink
          to="/profissionais"
          icon={Stethoscope}
          title="Equipe"
          desc="Profissionais, especialidades e cores"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: number;
  tone: "primary" | "success" | "destructive" | "accent";
}) {
  const map = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/10 text-destructive",
    accent: "bg-accent/15 text-accent",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`grid h-11 w-11 place-items-center rounded-lg ${map[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLink({ to, icon: Icon, title, desc }: any) {
  return (
    <Link
      to={to}
      className="group rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-secondary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
    </Link>
  );
}
