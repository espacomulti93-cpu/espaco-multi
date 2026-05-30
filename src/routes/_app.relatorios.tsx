import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, DollarSign, Users, CheckCircle2 } from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";

export const Route = createFileRoute("/_app/relatorios")({
  component: RelatoriosPage,
});

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function RelatoriosPage() {
  const today = new Date();
  const [inicio, setInicio] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [fim, setFim] = useState(format(endOfMonth(today), "yyyy-MM-dd"));

  const { data: agendamentos = [] } = useQuery({
    queryKey: ["rel-agendamentos", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("id, status, data_inicio, profissional:profissionais(nome)")
        .gte("data_inicio", `${inicio}T00:00:00`)
        .lte("data_inicio", `${fim}T23:59:59`);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: faturas = [] } = useQuery({
    queryKey: ["rel-faturas", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faturas")
        .select("id, valor, status, competencia, pago_em")
        .gte("competencia", inicio)
        .lte("competencia", fim);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: pacientesAtivos = 0 } = useQuery({
    queryKey: ["rel-pacientes-ativos"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("pacientes")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativo");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const stats = useMemo(() => {
    const total = agendamentos.length;
    const realizados = agendamentos.filter((a) => a.status === "realizado").length;
    const cancelados = agendamentos.filter((a) => a.status === "cancelado").length;
    const taxa = total > 0 ? Math.round((realizados / total) * 100) : 0;

    const receita = faturas
      .filter((f) => f.status === "paga")
      .reduce((s, f) => s + Number(f.valor), 0);
    const aReceber = faturas
      .filter((f) => f.status === "aberta")
      .reduce((s, f) => s + Number(f.valor), 0);
    const vencido = faturas
      .filter((f) => f.status === "vencida")
      .reduce((s, f) => s + Number(f.valor), 0);

    const porProfissional: Record<string, number> = {};
    agendamentos.forEach((a) => {
      const nome = a.profissional?.nome ?? "—";
      porProfissional[nome] = (porProfissional[nome] ?? 0) + 1;
    });
    const ranking = Object.entries(porProfissional).sort((a, b) => b[1] - a[1]);

    return { total, realizados, cancelados, taxa, receita, aReceber, vencido, ranking };
  }, [agendamentos, faturas]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1.5">
            <Label>Início</Label>
            <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Fim</Label>
            <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Calendar} label="Agendamentos" value={String(stats.total)} />
        <Stat icon={CheckCircle2} label="Realizados" value={`${stats.realizados} (${stats.taxa}%)`} />
        <Stat icon={DollarSign} label="Receita recebida" value={brl(stats.receita)} />
        <Stat icon={Users} label="Pacientes ativos" value={String(pacientesAtivos)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Financeiro do período</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Recebido" value={brl(stats.receita)} />
            <Row label="A receber" value={brl(stats.aReceber)} />
            <Row label="Vencido" value={brl(stats.vencido)} tone="destructive" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agendamentos por profissional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.ranking.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem dados no período.</p>
            )}
            {stats.ranking.map(([nome, qtd]) => {
              const max = stats.ranking[0]?.[1] ?? 1;
              const pct = (qtd / max) * 100;
              return (
                <div key={nome}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{nome}</span>
                    <span className="text-muted-foreground">{qtd}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status dos agendamentos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Total" value={stats.total} />
          <MiniStat label="Realizados" value={stats.realizados} />
          <MiniStat label="Cancelados" value={stats.cancelados} />
          <MiniStat label="Taxa de comparecimento" value={`${stats.taxa}%`} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "destructive" }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${tone === "destructive" ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
