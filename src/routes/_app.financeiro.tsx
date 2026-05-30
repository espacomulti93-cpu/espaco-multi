import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="ml-auto gap-1.5">
              <Plus className="h-4 w-4" /> Nova fatura
            </Button>
          </DialogTrigger>
          <NovaFaturaDialog
            onSaved={() => {
              setOpen(false);
              qc.invalidateQueries({ queryKey: ["faturas"] });
            }}
          />
        </Dialog>
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
                      {f.vencimento && ` · Venc. ${format(new Date(f.vencimento), "dd/MM/yyyy")}`}
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

function NovaFaturaDialog({ onSaved }: { onSaved: () => void }) {
  const [pacienteId, setPacienteId] = useState("");
  const [competencia, setCompetencia] = useState(format(new Date(), "yyyy-MM-01"));
  const [vencimento, setVencimento] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");

  const { data: pacientes = [] } = useQuery({
    queryKey: ["pacientes-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pacientes").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const v = Number(valor || 0);
      const { data: fat, error } = await supabase
        .from("faturas")
        .insert({
          paciente_id: pacienteId,
          competencia,
          vencimento: vencimento || null,
          valor: v,
          status: "aberta",
        })
        .select()
        .single();
      if (error) throw error;
      if (descricao) {
        await supabase.from("fatura_itens").insert({
          fatura_id: fat.id,
          descricao,
          quantidade: 1,
          valor_unitario: v,
          total: v,
        });
      }
    },
    onSuccess: () => {
      toast.success("Fatura criada");
      onSaved();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nova fatura</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Paciente</Label>
          <Select value={pacienteId} onValueChange={setPacienteId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {pacientes.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Competência</Label>
            <Input type="date" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Vencimento</Label>
            <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Valor (R$)</Label>
          <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Descrição (opcional)</Label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Sessões de maio" />
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={!pacienteId || !valor || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
