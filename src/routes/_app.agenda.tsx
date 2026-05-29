import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  addDays,
  addWeeks,
  endOfWeek,
  format,
  isSameDay,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/agenda")({
  component: Agenda,
});

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7h..19h
const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  realizado: "Realizado",
  falta: "Falta",
};

function Agenda() {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = useMemo(() => Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const [dialog, setDialog] = useState<{ open: boolean; editing?: any; defaults?: { date: Date; hour: number } }>({ open: false });
  const [cancelTarget, setCancelTarget] = useState<any>(null);

  const { data: ags = [] } = useQuery({
    queryKey: ["ags", weekStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*, pacientes(nome), profissionais(nome, cor), servicos(nome)")
        .gte("data_inicio", weekStart.toISOString())
        .lt("data_inicio", addDays(weekEnd, 1).toISOString())
        .order("data_inicio");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, -1))}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Hoje</Button>
        <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}><ChevronRight className="h-4 w-4" /></Button>
        <div className="ml-2 text-sm font-medium">
          {format(weekStart, "d 'de' MMM", { locale: ptBR })} – {format(weekEnd, "d 'de' MMM yyyy", { locale: ptBR })}
        </div>
        <Button className="ml-auto gap-1.5" onClick={() => setDialog({ open: true })}>
          <Plus className="h-4 w-4" /> Novo agendamento
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <div className="grid min-w-[900px] grid-cols-[60px_repeat(6,1fr)]">
            <div className="border-b border-r bg-muted/40 p-2 text-xs font-medium text-muted-foreground"></div>
            {days.map((d) => (
              <div key={d.toString()} className={`border-b border-r p-2 text-center text-xs font-medium ${isSameDay(d, new Date()) ? "bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground"}`}>
                <div>{format(d, "EEE", { locale: ptBR })}</div>
                <div className="text-base text-foreground">{format(d, "d")}</div>
              </div>
            ))}
            {HOURS.map((h) => (
              <FragmentRow key={h} h={h} days={days} ags={ags} onCellClick={(date) => setDialog({ open: true, defaults: { date, hour: h } })} onEdit={(a) => setDialog({ open: true, editing: a })} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialog.open} onOpenChange={(o) => setDialog({ open: o })}>
        {dialog.open && (
          <AgendamentoDialog
            editing={dialog.editing}
            defaults={dialog.defaults}
            onSaved={() => { setDialog({ open: false }); qc.invalidateQueries({ queryKey: ["ags"] }); }}
            onCancel={(a) => { setDialog({ open: false }); setCancelTarget(a); }}
          />
        )}
      </Dialog>

      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        {cancelTarget && (
          <CancelDialog
            ag={cancelTarget}
            onDone={() => { setCancelTarget(null); qc.invalidateQueries({ queryKey: ["ags"] }); }}
          />
        )}
      </Dialog>
    </div>
  );
}

function FragmentRow({ h, days, ags, onCellClick, onEdit }: any) {
  return (
    <>
      <div className="border-b border-r p-1 text-right text-xs text-muted-foreground">{String(h).padStart(2, "0")}:00</div>
      {days.map((d: Date) => {
        const cellAgs = ags.filter((a: any) => {
          const dt = new Date(a.data_inicio);
          return isSameDay(dt, d) && dt.getHours() === h;
        });
        return (
          <div
            key={d.toString() + h}
            onClick={() => onCellClick(d)}
            className="group relative min-h-[60px] cursor-pointer border-b border-r p-1 hover:bg-secondary/50"
          >
            {cellAgs.map((a: any) => (
              <button
                key={a.id}
                onClick={(e) => { e.stopPropagation(); onEdit(a); }}
                className="mb-1 block w-full rounded-md border-l-4 bg-card px-2 py-1 text-left text-xs shadow-sm transition hover:shadow"
                style={{ borderLeftColor: a.profissionais?.cor ?? "var(--primary)" }}
              >
                <div className="truncate font-medium">{a.pacientes?.nome}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {format(new Date(a.data_inicio), "HH:mm")} {a.servicos?.nome ? `• ${a.servicos.nome}` : ""}
                </div>
                {a.status !== "pendente" && (
                  <Badge variant="secondary" className="mt-1 h-4 px-1 text-[9px]">{STATUS_LABEL[a.status]}</Badge>
                )}
              </button>
            ))}
          </div>
        );
      })}
    </>
  );
}

function AgendamentoDialog({ editing, defaults, onSaved, onCancel }: any) {
  const initialStart = editing
    ? format(new Date(editing.data_inicio), "yyyy-MM-dd'T'HH:mm")
    : defaults
    ? format(new Date(defaults.date.setHours(defaults.hour, 0, 0, 0)), "yyyy-MM-dd'T'HH:mm")
    : format(new Date(), "yyyy-MM-dd'T'HH:mm");
  const initialEnd = editing
    ? format(new Date(editing.data_fim), "yyyy-MM-dd'T'HH:mm")
    : format(new Date(new Date(initialStart).getTime() + 50 * 60000), "yyyy-MM-dd'T'HH:mm");

  const [form, setForm] = useState({
    paciente_id: editing?.paciente_id ?? "",
    profissional_id: editing?.profissional_id ?? "",
    servico_id: editing?.servico_id ?? "",
    sala_id: editing?.sala_id ?? "",
    data_inicio: initialStart,
    data_fim: initialEnd,
    status: editing?.status ?? "pendente",
    recorrencia: editing?.recorrencia ?? "unica",
    observacoes: editing?.observacoes ?? "",
  });

  const { data: pacientes = [] } = useQuery({
    queryKey: ["pac-min"],
    queryFn: async () => (await supabase.from("pacientes").select("id, nome").order("nome")).data ?? [],
  });
  const { data: profissionais = [] } = useQuery({
    queryKey: ["prof-min"],
    queryFn: async () => (await supabase.from("profissionais").select("id, nome").eq("ativo", true).order("nome")).data ?? [],
  });
  const { data: servicos = [] } = useQuery({
    queryKey: ["serv-min"],
    queryFn: async () => (await supabase.from("servicos").select("id, nome, duracao_minutos").eq("ativo", true).order("nome")).data ?? [],
  });
  const { data: salas = [] } = useQuery({
    queryKey: ["salas-min"],
    queryFn: async () => (await supabase.from("salas").select("id, nome").eq("ativo", true).order("nome")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.paciente_id || !form.profissional_id) throw new Error("Selecione paciente e profissional");

      // Check conflicts for this professional
      const start = new Date(form.data_inicio).toISOString();
      const end = new Date(form.data_fim).toISOString();
      const { data: conflicts } = await supabase
        .from("agendamentos")
        .select("id")
        .eq("profissional_id", form.profissional_id)
        .neq("status", "cancelado")
        .lt("data_inicio", end)
        .gt("data_fim", start);
      const others = (conflicts ?? []).filter((c) => c.id !== editing?.id);
      if (others.length > 0) {
        const ok = confirm("⚠ Conflito de horário detectado para este profissional. Deseja salvar mesmo assim?");
        if (!ok) throw new Error("Cancelado pelo usuário");
      }

      const payload: any = {
        ...form,
        sala_id: form.sala_id || null,
        servico_id: form.servico_id || null,
        data_inicio: start,
        data_fim: end,
      };
      if (editing) {
        const { error } = await supabase.from("agendamentos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("agendamentos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "Agendamento atualizado" : "Agendamento criado"); onSaved(); },
    onError: (e: any) => e.message !== "Cancelado pelo usuário" && toast.error(e.message),
  });

  function onServicoChange(id: string) {
    const s: any = servicos.find((x: any) => x.id === id);
    if (s && !editing) {
      const newEnd = new Date(new Date(form.data_inicio).getTime() + s.duracao_minutos * 60000);
      setForm({ ...form, servico_id: id, data_fim: format(newEnd, "yyyy-MM-dd'T'HH:mm") });
    } else {
      setForm({ ...form, servico_id: id });
    }
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Paciente *</Label>
          <Select value={form.paciente_id} onValueChange={(v) => setForm({ ...form, paciente_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
            <SelectContent>
              {pacientes.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Profissional *</Label>
            <Select value={form.profissional_id} onValueChange={(v) => setForm({ ...form, profissional_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {profissionais.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Serviço</Label>
            <Select value={form.servico_id} onValueChange={onServicoChange}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {servicos.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Início *</Label>
            <Input type="datetime-local" required value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Fim *</Label>
            <Input type="datetime-local" required value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Sala</Label>
            <Select value={form.sala_id} onValueChange={(v) => setForm({ ...form, sala_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {salas.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Recorrência</Label>
            <Select value={form.recorrencia} onValueChange={(v) => setForm({ ...form, recorrencia: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unica">Única</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="quinzenal">Quinzenal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Observações</Label>
          <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </div>
        <DialogFooter className="gap-2">
          {editing && editing.status !== "cancelado" && (
            <Button type="button" variant="outline" className="mr-auto gap-1.5 text-destructive hover:text-destructive" onClick={() => onCancel(editing)}>
              <X className="h-4 w-4" /> Cancelar agendamento
            </Button>
          )}
          <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function CancelDialog({ ag, onDone }: any) {
  const [motivo, setMotivo] = useState("");
  const m = useMutation({
    mutationFn: async () => {
      if (!motivo.trim()) throw new Error("Informe o motivo");
      const { error } = await supabase
        .from("agendamentos")
        .update({ status: "cancelado", motivo_cancelamento: motivo })
        .eq("id", ag.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Agendamento cancelado"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Cancelar agendamento</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-3">
        <p className="text-sm text-muted-foreground">Informe o motivo do cancelamento. Esta ação não pode ser desfeita.</p>
        <Textarea required value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo…" />
        <DialogFooter>
          <Button type="submit" variant="destructive" disabled={m.isPending}>Confirmar cancelamento</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
