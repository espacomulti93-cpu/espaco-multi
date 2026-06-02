import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
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
import { ChevronLeft, ChevronRight, Plus, X, Check, ChevronsUpDown, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

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
              <FragmentRow key={h} h={h} days={days} ags={ags} onCellClick={(date: Date) => setDialog({ open: true, defaults: { date, hour: h } })} onEdit={(a: any) => setDialog({ open: true, editing: a })} />
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
            onCancel={(a: any) => { setDialog({ open: false }); setCancelTarget(a); }}
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

  const [tipoAgendamento, setTipoAgendamento] = useState<"sessao" | "anamnese">(() => {
    if (editing?.observacoes?.startsWith("[Tipo: Anamnese]")) {
      return "anamnese";
    }
    return "sessao";
  });

  const initialObservacoes = editing?.observacoes
    ? editing.observacoes.replace(/^\[Tipo: (Anamnese|Sessão Padrão)\]\n?/, "")
    : "";

  const [form, setForm] = useState({
    paciente_id: editing?.paciente_id ?? "",
    profissional_id: editing?.profissional_id ?? "",
    servico_id: editing?.servico_id ?? "",
    data_inicio: initialStart,
    data_fim: initialEnd,
    status: editing?.status ?? "pendente",
    recorrencia: editing?.recorrencia ?? "unica",
    observacoes: initialObservacoes,
  });

  const [pacienteOpen, setPacienteOpen] = useState(false);

  const [selectedSpecialty, setSelectedSpecialty] = useState(() => {
    if (editing?.servicos?.nome) {
      return editing.servicos.nome;
    }
    return "";
  });

  const { data: pacientes = [] } = useQuery({
    queryKey: ["pac-min"],
    queryFn: async () => (await supabase.from("pacientes").select("id, nome, cids_secundarios").order("nome")).data ?? [],
  });
  const { data: profissionais = [] } = useQuery({
    queryKey: ["prof-min"],
    queryFn: async () => (await supabase.from("profissionais").select("id, nome, especialidade, valor_sessao, valores_config").eq("ativo", true).order("nome")).data ?? [],
  });
  const { data: servicos = [] } = useQuery({
    queryKey: ["serv-min"],
    queryFn: async () => (await supabase.from("servicos").select("id, nome, duracao_minutos").eq("ativo", true).order("nome")).data ?? [],
  });

  const displayedPacientes = useMemo(() => {
    if (!form.profissional_id || !selectedSpecialty) return [];

    return pacientes.filter((pac: any) => {
      if (pac.id === editing?.paciente_id) return true;
      const pacSpecs = (pac.cids_secundarios as string[] || []).map((s: string) => s.toLowerCase());
      return pacSpecs.includes(selectedSpecialty.toLowerCase());
    });
  }, [pacientes, form.profissional_id, selectedSpecialty, editing]);

  const selectedPaciente = pacientes.find((p: any) => p.id === form.paciente_id);

  const formDate = form.data_inicio ? form.data_inicio.split("T")[0] : "";
  const formTime = form.data_inicio ? form.data_inicio.split("T")[1] : "";

  // 1. Filter professionals registered on patient's file (having custom discounts)
  const patientProfessionals = useMemo(() => {
    if (!form.paciente_id) return [];
    return profissionais.filter((prof: any) => {
      const config = prof.valores_config as any;
      return config?.descontos?.some((d: any) => d.paciente_id === form.paciente_id);
    });
  }, [profissionais, form.paciente_id]);

  // Fallback to all active professionals if none are configured on the patient's card
  const displayedProfessionals = useMemo(() => {
    if (patientProfessionals.length > 0) {
      return patientProfessionals;
    }
    return profissionais;
  }, [patientProfessionals, profissionais]);

  // 2. Parse specialties registered on selected professional's file
  const professionalSpecialties = useMemo(() => {
    if (!form.profissional_id) return [];
    const prof = profissionais.find((p: any) => p.id === form.profissional_id);
    if (!prof || !prof.especialidade) return [];
    return prof.especialidade.split(",").map((s: string) => s.trim()).filter(Boolean);
  }, [profissionais, form.profissional_id]);

  // Auto-select specialty if only one is available
  useEffect(() => {
    if (professionalSpecialties.length === 1) {
      setSelectedSpecialty(professionalSpecialties[0]);
    } else if (professionalSpecialties.length > 0) {
      if (!professionalSpecialties.includes(selectedSpecialty)) {
        setSelectedSpecialty("");
      }
    } else {
      setSelectedSpecialty("");
    }
  }, [professionalSpecialties]);

  // 3. Find configured rates/plans
  const currentPricing = useMemo(() => {
    if (!form.profissional_id || !selectedSpecialty) return null;
    const prof = profissionais.find((p: any) => p.id === form.profissional_id);
    if (!prof) return null;

    const config = prof.valores_config as any || { especialidades: [], descontos: [] };

    // Check custom patient discount
    const discount = config.descontos?.find(
      (d: any) => d.paciente_id === form.paciente_id && d.especialidade === selectedSpecialty
    );

    if (discount) {
      return {
        type: "Paciente (Desconto)",
        valor_sessao: discount.valor_sessao,
        valor_avaliacao: discount.valor_avaliacao,
      };
    }

    // Check standard specialty rates
    const specConfig = config.especialidades?.find((e: any) => e.nome === selectedSpecialty);
    if (specConfig) {
      return {
        type: "Padrão Especialidade",
        valor_sessao: selectedSpecialty.toUpperCase() === "AP" ? null : (specConfig.valor_sessao ?? prof.valor_sessao),
        valor_avaliacao: specConfig.valor_avaliacao,
        plano_mensal: specConfig.plano_mensal,
      };
    }

    // Default professional rate
    return {
      type: "Padrão Profissional",
      valor_sessao: prof.valor_sessao,
      valor_avaliacao: null,
    };
  }, [form.profissional_id, form.paciente_id, selectedSpecialty, profissionais]);

  const getSelectedSpecialtyDuration = () => {
    const s: any = servicos.find((x: any) => x.nome.toLowerCase() === selectedSpecialty.toLowerCase());
    return s ? s.duracao_minutos : 50;
  };

  const handleDateChange = (dateVal: string) => {
    if (!dateVal) return;
    const timeVal = form.data_inicio ? form.data_inicio.split("T")[1] || "09:00" : "09:00";
    const newStart = `${dateVal}T${timeVal}`;
    const duration = getSelectedSpecialtyDuration();
    const newEnd = format(new Date(new Date(newStart).getTime() + duration * 60000), "yyyy-MM-dd'T'HH:mm");
    setForm({
      ...form,
      data_inicio: newStart,
      data_fim: newEnd,
    });
  };

  const handleTimeChange = (timeVal: string) => {
    if (!timeVal) return;
    const dateVal = form.data_inicio ? form.data_inicio.split("T")[0] || format(new Date(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    const newStart = `${dateVal}T${timeVal}`;
    const duration = getSelectedSpecialtyDuration();
    const newEnd = format(new Date(new Date(newStart).getTime() + duration * 60000), "yyyy-MM-dd'T'HH:mm");
    setForm({
      ...form,
      data_inicio: newStart,
      data_fim: newEnd,
    });
  };

  const handlePacienteChange = (pacId: string) => {
    setForm((prev) => ({
      ...prev,
      paciente_id: pacId,
    }));
  };

  const handleProfissionalChange = (profId: string) => {
    setForm((prev) => {
      const newPacienteId = prev.paciente_id === editing?.paciente_id ? prev.paciente_id : "";
      return {
        ...prev,
        profissional_id: profId,
        paciente_id: newPacienteId,
      };
    });
    setSelectedSpecialty("");
  };

  const handleSpecialtyChange = (spec: string) => {
    setSelectedSpecialty(spec);
    const s: any = servicos.find((x: any) => x.nome.toLowerCase() === spec.toLowerCase());
    const duration = s ? s.duracao_minutos : 50;
    const newEnd = format(new Date(new Date(form.data_inicio).getTime() + duration * 60000), "yyyy-MM-dd'T'HH:mm");
    setForm((prev) => {
      const currentPac = pacientes.find((pac: any) => pac.id === prev.paciente_id);
      const pacSpecs = (currentPac?.cids_secundarios as string[] || []).map((s: string) => s.toLowerCase());
      const hasSpec = pacSpecs.includes(spec.toLowerCase());
      const newPacienteId = (hasSpec || prev.paciente_id === editing?.paciente_id)
        ? prev.paciente_id
        : "";
      return {
        ...prev,
        paciente_id: newPacienteId,
        data_fim: newEnd,
      };
    });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.paciente_id || !form.profissional_id) throw new Error("Selecione paciente e profissional");

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

      const matchingServico = servicos.find(
        (s: any) => s.nome.toLowerCase() === selectedSpecialty.toLowerCase()
      );

      const typePrefix = selectedSpecialty.toUpperCase() !== "AP"
        ? (tipoAgendamento === "anamnese" ? "[Tipo: Anamnese]\n" : "[Tipo: Sessão Padrão]\n")
        : "";

      const payload: any = {
        ...form,
        sala_id: null,
        servico_id: matchingServico ? matchingServico.id : null,
        data_inicio: start,
        data_fim: end,
        observacoes: typePrefix + form.observacoes,
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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("agendamentos")
        .delete()
        .eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento excluído com sucesso");
      onSaved();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Profissional *</Label>
          <Select value={form.profissional_id} onValueChange={handleProfissionalChange}>
            <SelectTrigger><SelectValue placeholder="Selecione o profissional…" /></SelectTrigger>
            <SelectContent>
              {profissionais.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {form.profissional_id && (
          <div className="space-y-1.5 animate-in fade-in duration-200">
            <Label>Especialidade *</Label>
            <Select value={selectedSpecialty} onValueChange={handleSpecialtyChange}>
              <SelectTrigger><SelectValue placeholder="Selecione a especialidade…" /></SelectTrigger>
              <SelectContent>
                {professionalSpecialties.map((s: string) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {form.profissional_id && selectedSpecialty && (
          <div className="space-y-1.5 animate-in fade-in duration-200">
            <Label>Paciente *</Label>
            <Popover open={pacienteOpen} onOpenChange={setPacienteOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={pacienteOpen}
                  className="w-full justify-between font-normal text-left px-3"
                >
                  {selectedPaciente ? selectedPaciente.nome : "Selecione o paciente..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Pesquisar paciente..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                    <CommandGroup>
                      {displayedPacientes.map((p: any) => (
                        <CommandItem
                          key={p.id}
                          value={p.nome}
                          onSelect={() => {
                            handlePacienteChange(p.id);
                            setPacienteOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              form.paciente_id === p.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {p.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {form.profissional_id && form.paciente_id && selectedSpecialty && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {selectedSpecialty.toUpperCase() !== "AP" && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <Label>Tipo de Agendamento *</Label>
                <Select value={tipoAgendamento} onValueChange={(v: any) => setTipoAgendamento(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sessao">Sessão Padrão</SelectItem>
                    <SelectItem value="anamnese">Anamnese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentPricing && (
              <div className="rounded-lg border bg-accent/20 p-3 text-xs space-y-1.5 shadow-inner">
                <div className="font-semibold text-muted-foreground flex justify-between">
                  <span>Valor do Agendamento</span>
                  <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                    {currentPricing.type}
                  </span>
                </div>
                <div className="mt-1">
                  {selectedSpecialty.toUpperCase() === "AP" && currentPricing.plano_mensal ? (
                    <div>
                      <span className="text-muted-foreground">Plano Mensal (AP): </span>
                      <span className="font-semibold text-foreground">{currentPricing.plano_mensal}</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-muted-foreground">
                        {tipoAgendamento === "sessao" ? "Sessão Padrão: " : "Anamnese: "}
                      </span>
                      <span className="font-bold text-foreground text-sm font-mono">
                        {tipoAgendamento === "sessao"
                          ? (currentPricing.valor_sessao !== null && currentPricing.valor_sessao !== undefined
                              ? `R$ ${Number(currentPricing.valor_sessao).toFixed(2)}`
                              : "—")
                          : (currentPricing.valor_avaliacao !== null && currentPricing.valor_avaliacao !== undefined
                              ? `R$ ${Number(currentPricing.valor_avaliacao).toFixed(2)}`
                              : "—")
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Data *</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input type="date" required value={formDate} onChange={(e) => handleDateChange(e.target.value)} />
                <Input type="time" required value={formTime} onChange={(e) => handleTimeChange(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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

            <DialogFooter className="gap-2 pt-2 border-t mt-4 justify-between flex-wrap">
              <div className="flex gap-2">
                {editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (confirm("Tem certeza que deseja excluir permanentemente este agendamento? Esta ação não pode ser desfeita.")) {
                        deleteMutation.mutate();
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Excluir
                  </Button>
                )}
                {editing && editing.status !== "cancelado" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5 text-muted-foreground hover:text-destructive"
                    onClick={() => onCancel(editing)}
                  >
                    <X className="h-4 w-4" /> Cancelar agendamento
                  </Button>
                )}
              </div>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
            </DialogFooter>
          </div>
        )}
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
