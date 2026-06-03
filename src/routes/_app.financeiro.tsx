import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/financeiro")({
  component: FinanceiroPage,
});

type FaturaStatus = "aberta" | "paga" | "vencida" | "cancelada";

const statusLabel: Record<FaturaStatus, string> = {
  aberta: "Aberta",
  paga: "Paga",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

const statusVariant: Record<FaturaStatus, "default" | "secondary" | "destructive" | "outline"> = {
  aberta: "secondary",
  paga: "default",
  vencida: "destructive",
  cancelada: "outline",
};

function brl(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function FinanceiroPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [open, setOpen] = useState(false);

  const { data: faturas = [], isLoading } = useQuery({
    queryKey: ["faturas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faturas")
        .select("*, paciente:pacientes(id, nome)")
        .order("competencia", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = useMemo(
    () =>
      faturas.filter((f) => {
        const matchStatus = statusFilter === "todos" || f.status === statusFilter;
        const matchQ = !q || (f.paciente?.nome ?? "").toLowerCase().includes(q.toLowerCase());
        return matchStatus && matchQ;
      }),
    [faturas, q, statusFilter]
  );

  const totals = useMemo(() => {
    const t = { aberto: 0, pago: 0, vencido: 0 };
    faturas.forEach((f) => {
      if (f.status === "aberta") t.aberto += Number(f.valor);
      if (f.status === "paga") t.pago += Number(f.valor);
      if (f.status === "vencida") t.vencido += Number(f.valor);
    });
    return t;
  }, [faturas]);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="faturas" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="faturas" className="gap-1.5">
            <DollarSign className="h-4 w-4" />
            Faturas
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faturas" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard icon={DollarSign} label="Em aberto" value={brl(totals.aberto)} tone="muted" />
            <StatCard icon={CheckCircle2} label="Recebido" value={brl(totals.pago)} tone="primary" />
            <StatCard icon={AlertCircle} label="Vencido" value={brl(totals.vencido)} tone="destructive" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por paciente…"
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberta">Aberta</SelectItem>
                <SelectItem value="paga">Paga</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <div className="bg-primary/5 border border-primary/20 text-foreground text-xs rounded-lg p-3 flex gap-2 items-center font-medium animate-in fade-in duration-200 ml-auto max-w-md">
              <AlertCircle className="h-4 w-4 text-primary shrink-0" />
              <span>
                As faturas são geradas e atualizadas de forma 100% automática a partir dos agendamentos com status "Confirmado" na Agenda.
              </span>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma fatura.</div>
              ) : (
                <div className="divide-y">
                  {filtered.map((f) => (
                    <Link
                      key={f.id}
                      to="/financeiro/$id"
                      params={{ id: f.id }}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/40"
                    >
                      <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{f.paciente?.nome ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          Competência {format(new Date(f.competencia), "MMM yyyy", { locale: ptBR })}
                          {f.vencimento && ` · Venc. {format(new Date(f.vencimento), "dd/MM/yyyy")}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{brl(Number(f.valor))}</div>
                        <Badge variant={statusVariant[f.status as FaturaStatus]} className="mt-1">
                          {statusLabel[f.status as FaturaStatus]}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relatorios">
          <RelatoriosTabContent />
        </TabsContent>
      </Tabs>
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
  value: string;
  tone: "muted" | "primary" | "destructive";
}) {
  const toneCls =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "destructive"
      ? "bg-destructive/10 text-destructive"
      : "bg-muted text-muted-foreground";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`grid h-10 w-10 place-items-center rounded-md ${toneCls}`}>
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

function RelatoriosTabContent() {
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
        <RelatorioStat icon={Calendar} label="Agendamentos" value={String(stats.total)} />
        <RelatorioStat icon={CheckCircle2} label="Realizados" value={`${stats.realizados} (${stats.taxa}%)`} />
        <RelatorioStat icon={DollarSign} label="Receita recebida" value={brl(stats.receita)} />
        <RelatorioStat icon={Users} label="Pacientes ativos" value={String(pacientesAtivos)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Financeiro do período</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <RelatorioRow label="Recebido" value={brl(stats.receita)} />
            <RelatorioRow label="A receber" value={brl(stats.aReceber)} />
            <RelatorioRow label="Vencido" value={brl(stats.vencido)} tone="destructive" />
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
          <RelatorioMiniStat label="Total" value={stats.total} />
          <RelatorioMiniStat label="Realizados" value={stats.realizados} />
          <RelatorioMiniStat label="Cancelados" value={stats.cancelados} />
          <RelatorioMiniStat label="Taxa de comparecimento" value={`${stats.taxa}%`} />
        </CardContent>
      </Card>
    </div>
  );
}

function RelatorioStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
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

function RelatorioRow({ label, value, tone }: { label: string; value: string; tone?: "destructive" }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${tone === "destructive" ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}

function RelatorioMiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
