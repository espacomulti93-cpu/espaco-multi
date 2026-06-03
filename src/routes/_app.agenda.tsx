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
import { ChevronLeft, ChevronRight, Plus, X, Check, ChevronsUpDown, Trash2, MessageCircle } from "lucide-react";
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
        .select("*, pacientes(nome, cids_secundarios), profissionais(nome, cor, especialidade), servicos(nome)")
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
            onSaved={() => {
              setDialog({ open: false });
              qc.invalidateQueries({ queryKey: ["ags"] });
              qc.invalidateQueries({ queryKey: ["patient-ags-dialog"] });
            }}
            onCancel={(a: any) => { setDialog({ open: false }); setCancelTarget(a); }}
          />
        )}
      </Dialog>

      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        {cancelTarget && (
          <CancelDialog
            ag={cancelTarget}
            onDone={() => {
              setCancelTarget(null);
              qc.invalidateQueries({ queryKey: ["ags"] });
              qc.invalidateQueries({ queryKey: ["patient-ags-dialog"] });
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

const safeFormatDate = (dateVal: any, formatStr: string, options?: any) => {
  if (!dateVal) return "—";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "—";
  try {
    return format(d, formatStr, options);
  } catch (e) {
    return "—";
  }
};

const getEspecialidade = (a: any) => {
  if (a.servicos?.nome) return a.servicos.nome;
  const pacSpecs = (Array.isArray(a.pacientes?.cids_secundarios) ? a.pacientes.cids_secundarios : [])
    .filter((s: any): s is string => typeof s === 'string');
  const profSpecs = a.profissionais?.especialidade
    ? a.profissionais.especialidade.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];
  const intersection = pacSpecs.filter((s: string) =>
    profSpecs.some((ps: string) => ps.toLowerCase() === s.toLowerCase())
  );
  if (intersection.length > 0) return intersection[0];
  if (profSpecs.length > 0) return profSpecs[0];
  return null;
};

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
                <div className="truncate font-medium text-foreground">
                  {a.pacientes?.nome}
                </div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {safeFormatDate(a.data_inicio, "HH:mm")}
                </div>
                <div className="truncate text-[9px] text-muted-foreground">
                  {a.profissionais?.nome}
                </div>
                {getEspecialidade(a) && (
                  <div className="truncate text-[9px] font-medium text-primary">
                    {getEspecialidade(a)}
                  </div>
                )}
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
  const qc = useQueryClient();
  const initialStart = editing && editing.data_inicio
    ? safeFormatDate(editing.data_inicio, "yyyy-MM-dd'T'HH:mm")
    : defaults
    ? format(new Date(defaults.date.setHours(defaults.hour, 0, 0, 0)), "yyyy-MM-dd'T'HH:mm")
    : format(new Date(), "yyyy-MM-dd'T'HH:mm");
  const initialEnd = editing && editing.data_fim
    ? safeFormatDate(editing.data_fim, "yyyy-MM-dd'T'HH:mm")
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
    recorrencia: editing?.recorrencia ?? "semanal",
    observacoes: initialObservacoes,
  });

  const [pacienteOpen, setPacienteOpen] = useState(false);

  const [selectedSpecialty, setSelectedSpecialty] = useState(() => {
    if (editing) {
      return editing.servicos?.nome || getEspecialidade(editing) || "";
    }
    return "";
  });

  const specialtyUpper = (selectedSpecialty || "").toUpperCase();

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

  const { data: patientAgs = [] } = useQuery({
    queryKey: ["patient-ags-dialog", form.paciente_id],
    queryFn: async () => {
      if (!form.paciente_id) return [];
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*, profissionais(nome, cor), servicos(nome)")
        .eq("paciente_id", form.paciente_id)
        .order("data_inicio", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!form.paciente_id,
  });

  const sortedPatientAgs = useMemo(() => {
    if (!Array.isArray(patientAgs)) return [];
    return [...patientAgs]
      .filter((a: any) => a?.data_inicio && !isNaN(new Date(a.data_inicio).getTime()))
      .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());
  }, [patientAgs]);

  const { data: responsaveisPaciente = [] } = useQuery({
    queryKey: ["responsaveis-paciente-dialog", form.paciente_id],
    queryFn: async () => {
      if (!form.paciente_id) return [];
      const { data, error } = await supabase
        .from("responsaveis")
        .select("telefone, whatsapp, nome")
        .eq("paciente_id", form.paciente_id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!form.paciente_id,
  });

  const selectedPaciente = pacientes.find((p: any) => p.id === form.paciente_id);

  const whatsappUrl = useMemo(() => {
    if (!Array.isArray(responsaveisPaciente) || !responsaveisPaciente.length) return null;
    const respWithWhats = responsaveisPaciente.find((r: any) => r?.whatsapp);
    const respWithTel = responsaveisPaciente.find((r: any) => r?.telefone);
    const num = respWithWhats?.whatsapp || respWithWhats?.telefone || respWithTel?.whatsapp || respWithTel?.telefone;
    if (!num) return null;

    const cleanNum = String(num).replace(/\D/g, "");
    if (!cleanNum) return null;

    let phoneWithCountry = cleanNum;
    if (cleanNum.length === 10 || cleanNum.length === 11) {
      phoneWithCountry = "55" + cleanNum;
    }

    const dateObj = form.data_inicio ? new Date(form.data_inicio) : null;
    let formattedDate = "";
    if (dateObj && !isNaN(dateObj.getTime())) {
      const rawDateStr = format(dateObj, "EEEE, dd/MM 'às' HH:mm", { locale: ptBR });
      formattedDate = rawDateStr.charAt(0).toUpperCase() + rawDateStr.slice(1);
    }

    let textMsg = "";
    if (tipoAgendamento === "anamnese") {
      textMsg = `Olá! \u{1F604}
Estou com uma vaga para Avaliação ${selectedSpecialty || "terapia"} para *${formattedDate}*.

Você tem interesse em agendar a avaliação?`;
    } else {
      textMsg = `Olá! \u{1F604}
Sua sessão de ${selectedSpecialty || "terapia"} está agendada para *${formattedDate}*.

Você pode confirmar, por favor?

\u{26A0}\u{FE0F} *Importante: em caso de ausência ou cancelamento sem aviso prévio, a sessão será cobrada normalmente.*

Fico à disposição para qualquer dúvida!`;
    }

    const msg = encodeURIComponent(textMsg);
    return `https://wa.me/${phoneWithCountry}?text=${msg}`;
  }, [responsaveisPaciente, selectedPaciente, editing, form.data_inicio, selectedSpecialty, tipoAgendamento]);

  const displayedPacientes = useMemo(() => {
    if (editing) {
      if (!form.profissional_id || !selectedSpecialty) return pacientes;
    } else {
      if (!form.profissional_id || !selectedSpecialty) return [];
    }

    return pacientes.filter((pac: any) => {
      if (pac.id === editing?.paciente_id) return true;
      const pacSpecs = (Array.isArray(pac.cids_secundarios) ? pac.cids_secundarios : [])
        .filter((s: any): s is string => typeof s === 'string')
        .map((s: string) => s.toLowerCase());
      return pacSpecs.includes(selectedSpecialty.toLowerCase());
    });
  }, [pacientes, form.profissional_id, selectedSpecialty, editing]);

  const formDate = form.data_inicio ? form.data_inicio.split("T")[0] : "";
  const formTime = form.data_inicio ? form.data_inicio.split("T")[1] : "";

  // 1. Filter professionals registered on patient's file (having custom discounts)
  const patientProfessionals = useMemo(() => {
    if (!form.paciente_id) return [];
    return profissionais.filter((prof: any) => {
      const config = prof.valores_config as any;
      return Array.isArray(config?.descontos) && config.descontos.some((d: any) => d.paciente_id === form.paciente_id);
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
    if (!prof) return [];
    const specs = prof.especialidade
      ? prof.especialidade.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];
    if (selectedSpecialty && !specs.includes(selectedSpecialty)) {
      specs.push(selectedSpecialty);
    }
    return specs;
  }, [profissionais, form.profissional_id, selectedSpecialty]);

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
    const discount = Array.isArray(config.descontos)
      ? config.descontos.find(
          (d: any) =>
            d.paciente_id === form.paciente_id &&
            typeof d.especialidade === 'string' &&
            d.especialidade.toLowerCase() === selectedSpecialty.toLowerCase()
        )
      : null;

    if (discount) {
      return {
        type: "Paciente (Desconto)",
        valor_sessao: discount.valor_sessao,
        valor_avaliacao: discount.valor_avaliacao,
      };
    }

    // Check standard specialty rates
    const specConfig = Array.isArray(config.especialidades)
      ? config.especialidades.find(
          (e: any) => typeof e?.nome === 'string' && e.nome.toLowerCase() === selectedSpecialty.toLowerCase()
        )
      : null;
    if (specConfig) {
      return {
        type: "Padrão Especialidade",
        valor_sessao: specialtyUpper === "AP" ? null : (specConfig.valor_sessao ?? prof.valor_sessao),
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
  }, [form.profissional_id, form.paciente_id, selectedSpecialty, profissionais, specialtyUpper]);

  const getSelectedSpecialtyDuration = () => {
    const s: any = servicos.find((x: any) => x.nome?.toLowerCase() === selectedSpecialty?.toLowerCase());
    return s ? s.duracao_minutos : 50;
  };

  const handleDateChange = (dateVal: string) => {
    if (!dateVal) return;
    const timeVal = form.data_inicio ? form.data_inicio.split("T")[1] || "09:00" : "09:00";
    const newStart = `${dateVal}T${timeVal}`;
    const duration = getSelectedSpecialtyDuration();
    const newEnd = safeFormatDate(new Date(newStart).getTime() + duration * 60000, "yyyy-MM-dd'T'HH:mm");
    setForm({
      ...form,
      data_inicio: newStart,
      data_fim: newEnd,
    });
  };

  const handleTimeChange = (timeVal: string) => {
    if (!timeVal) return;
    const dateVal = form.data_inicio ? form.data_inicio.split("T")[0] || safeFormatDate(new Date(), "yyyy-MM-dd") : safeFormatDate(new Date(), "yyyy-MM-dd");
    const newStart = `${dateVal}T${timeVal}`;
    const duration = getSelectedSpecialtyDuration();
    const newEnd = safeFormatDate(new Date(newStart).getTime() + duration * 60000, "yyyy-MM-dd'T'HH:mm");
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
    const s: any = servicos.find((x: any) => x.nome?.toLowerCase() === spec?.toLowerCase());
    const duration = s ? s.duracao_minutos : 50;
    const newEnd = safeFormatDate(new Date(form.data_inicio).getTime() + duration * 60000, "yyyy-MM-dd'T'HH:mm");
    setForm((prev) => {
      const currentPac = pacientes.find((pac: any) => pac.id === prev.paciente_id);
      const pacSpecs = (Array.isArray(currentPac?.cids_secundarios) ? currentPac.cids_secundarios : [])
        .filter((s: any): s is string => typeof s === 'string')
        .map((s: string) => s.toLowerCase());
      const hasSpec = pacSpecs.includes(spec?.toLowerCase());
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

      let matchingServico = servicos.find(
        (s: any) => s.nome?.toLowerCase() === selectedSpecialty?.toLowerCase()
      );

      if (!matchingServico && selectedSpecialty) {
        const { data: newServ, error: servError } = await supabase
          .from("servicos")
          .insert({ nome: selectedSpecialty, duracao_minutos: 50 })
          .select()
          .single();
        if (servError) throw servError;
        matchingServico = newServ;
        qc.invalidateQueries({ queryKey: ["serv-min"] });
      }

      const typePrefix = specialtyUpper !== "AP"
        ? (tipoAgendamento === "anamnese" ? "[Tipo: Anamnese]\n" : "[Tipo: Sessão Padrão]\n")
        : "";

      if (editing) {
        const hasOtherFieldsChanged = 
          form.paciente_id !== (editing.paciente_id ?? "") ||
          form.profissional_id !== (editing.profissional_id ?? "") ||
          selectedSpecialty !== (editing.servicos?.nome || getEspecialidade(editing) || "") ||
          form.data_inicio !== initialStart ||
          form.data_fim !== initialEnd ||
          form.recorrencia !== (editing.recorrencia ?? "unica") ||
          form.observacoes !== initialObservacoes;

        let updateAllFuture = false;
        if (editing.recorrencia_grupo && hasOtherFieldsChanged) {
          updateAllFuture = confirm(
            "Este agendamento faz parte de uma série recorrente. Deseja aplicar estas alterações também para todas as datas futuras da série?"
          );
        }

        const payload: any = {
          ...form,
          sala_id: null,
          servico_id: matchingServico ? matchingServico.id : null,
          data_inicio: start,
          data_fim: end,
          observacoes: typePrefix + form.observacoes,
        };

        if (updateAllFuture) {
          const { data: futureAgs, error: fetchError } = await supabase
            .from("agendamentos")
            .select("id, data_inicio, data_fim")
            .eq("recorrencia_grupo", editing.recorrencia_grupo)
            .gte("data_inicio", editing.data_inicio);

          if (fetchError) throw fetchError;

          const startDiff = new Date(form.data_inicio).getTime() - new Date(editing.data_inicio).getTime();
          const endDiff = new Date(form.data_fim).getTime() - new Date(editing.data_fim).getTime();

          const updates = (futureAgs ?? []).map((occ) => {
            const occStart = new Date(new Date(occ.data_inicio).getTime() + startDiff).toISOString();
            const occEnd = new Date(new Date(occ.data_fim).getTime() + endDiff).toISOString();
            return supabase
              .from("agendamentos")
              .update({
                paciente_id: form.paciente_id,
                profissional_id: form.profissional_id,
                servico_id: matchingServico ? matchingServico.id : null,
                data_inicio: occStart,
                data_fim: occEnd,
                recorrencia: form.recorrencia,
                observacoes: typePrefix + form.observacoes,
              })
              .eq("id", occ.id);
          });

          await Promise.all(updates);
        } else {
          const { error } = await supabase.from("agendamentos").update(payload).eq("id", editing.id);
          if (error) throw error;
        }
      } else {
        if (form.recorrencia !== "unica") {
          const occurrences: any[] = [];
          const numOccurrences = 12;
          const groupId = crypto.randomUUID();

          for (let i = 0; i < numOccurrences; i++) {
            let occStart: Date;
            let occEnd: Date;
            if (form.recorrencia === "semanal") {
              occStart = addWeeks(new Date(form.data_inicio), i);
              occEnd = addWeeks(new Date(form.data_fim), i);
            } else if (form.recorrencia === "quinzenal") {
              occStart = addWeeks(new Date(form.data_inicio), i * 2);
              occEnd = addWeeks(new Date(form.data_fim), i * 2);
            } else if (form.recorrencia === "mensal") {
              const baseStart = new Date(form.data_inicio);
              const baseEnd = new Date(form.data_fim);
              occStart = new Date(baseStart.getFullYear(), baseStart.getMonth() + i, baseStart.getDate(), baseStart.getHours(), baseStart.getMinutes());
              occEnd = new Date(baseEnd.getFullYear(), baseEnd.getMonth() + i, baseEnd.getDate(), baseEnd.getHours(), baseEnd.getMinutes());
            } else {
              occStart = new Date(form.data_inicio);
              occEnd = new Date(form.data_fim);
            }

            const payload: any = {
              ...form,
              sala_id: null,
              servico_id: matchingServico ? matchingServico.id : null,
              data_inicio: occStart.toISOString(),
              data_fim: occEnd.toISOString(),
              observacoes: typePrefix + form.observacoes,
              recorrencia_grupo: groupId,
            };
            occurrences.push(payload);
          }
          const { error } = await supabase.from("agendamentos").insert(occurrences);
          if (error) throw error;
        } else {
          const payload: any = {
            ...form,
            sala_id: null,
            servico_id: matchingServico ? matchingServico.id : null,
            data_inicio: start,
            data_fim: end,
            observacoes: typePrefix + form.observacoes,
          };
          const { error } = await supabase.from("agendamentos").insert(payload);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => { toast.success(editing ? "Agendamento atualizado" : "Agendamento criado"); onSaved(); },
    onError: (e: any) => e.message !== "Cancelado pelo usuário" && toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (deleteAllFuture: boolean) => {
      if (deleteAllFuture && editing?.recorrencia_grupo) {
        const { error } = await supabase
          .from("agendamentos")
          .delete()
          .eq("recorrencia_grupo", editing.recorrencia_grupo)
          .gte("data_inicio", editing.data_inicio);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("agendamentos")
          .delete()
          .eq("id", editing.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Agendamento excluído com sucesso");
      onSaved();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
        {editing && (
          <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-3 animate-in fade-in duration-200">
            <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Dados Agendados & Histórico
            </div>
            
            <div className="max-h-36 overflow-y-auto pr-1 space-y-3 divider-y">
              {/* Resumo do Agendamento Atual */}
              <div className="space-y-1.5 pb-2 border-b border-border/60">
                <div className="font-medium text-primary text-[10px] uppercase">Agendamento Atual</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <span className="text-muted-foreground font-medium">Paciente:</span>{" "}
                    <span className="text-foreground font-semibold">{editing.pacientes?.nome || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium">Profissional:</span>{" "}
                    <span className="text-foreground font-semibold">{editing.profissionais?.nome || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium">Especialidade:</span>{" "}
                    <span className="text-foreground font-semibold">{editing.servicos?.nome || editing.profissionais?.especialidade || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium">Data/Hora:</span>{" "}
                    <span className="text-foreground font-semibold">
                      {safeFormatDate(editing.data_inicio, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-1">
                    <span className="text-muted-foreground font-medium">Status:</span>{" "}
                    <Badge variant="secondary" className="h-4 px-1 text-[9px] font-semibold">
                      {STATUS_LABEL[editing.status] || editing.status || ""}
                    </Badge>
                    {editing.status !== "confirmado" && whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 ml-1 text-[10px] text-green-600 hover:text-green-700 hover:underline font-semibold"
                        title="Contatar via WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5 fill-green-600/10" /> WhatsApp
                      </a>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium">Recorrência:</span>{" "}
                    <span className="text-foreground font-semibold capitalize">{editing.recorrencia || "única"}</span>
                  </div>
                </div>
                {editing.observacoes && (
                  <div className="mt-1">
                    <span className="text-muted-foreground font-medium">Observações:</span>{" "}
                    <span className="text-foreground whitespace-pre-wrap">{editing.observacoes.replace(/^\[Tipo: (Anamnese|Sessão Padrão)\]\n?/, "")}</span>
                  </div>
                )}
              </div>

              {/* Todos os Agendamentos do Paciente */}
              <div className="space-y-1.5 pt-1">
                <div className="font-medium text-primary text-[10px] uppercase flex items-center justify-between">
                  <span>Todos os Agendamentos do Paciente ({patientAgs.length})</span>
                </div>
                 {sortedPatientAgs.length === 0 ? (
                  <p className="text-muted-foreground italic">Nenhum outro agendamento encontrado.</p>
                ) : (
                  <div className="space-y-1.5">
                    {sortedPatientAgs.map((a: any) => (
                      <div key={a.id} className={cn(
                        "p-1.5 rounded border flex items-center justify-between text-[11px] transition",
                        a.id === editing.id ? "bg-primary/5 border-primary/30" : "bg-card border-border/40"
                      )}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: a.profissionais?.cor || "var(--primary)" }} />
                          <div>
                            <span className="font-medium text-foreground">
                              {safeFormatDate(a.data_inicio, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                            <span className="text-muted-foreground mx-1">•</span>
                            <span className="text-muted-foreground">
                              {a.profissionais?.nome} ({a.servicos?.nome || "Sessão"})
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn(
                          "h-4 px-1 text-[8px] uppercase font-bold shrink-0",
                          a.status === "confirmado" && "border-green-500/30 text-green-600 bg-green-50/50",
                          a.status === "cancelado" && "border-red-500/30 text-red-600 bg-red-50/50",
                          a.status === "realizado" && "border-blue-500/30 text-blue-600 bg-blue-50/50",
                          a.status === "falta" && "border-orange-500/30 text-orange-600 bg-orange-50/50",
                          a.status === "pendente" && "border-yellow-500/30 text-yellow-600 bg-yellow-50/50"
                        )}>
                          {STATUS_LABEL[a.status] || a.status || ""}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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

        {(form.profissional_id || editing) && (
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

        {(form.profissional_id && selectedSpecialty || editing) && (
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

        {(form.profissional_id && form.paciente_id && selectedSpecialty || editing) && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {specialtyUpper !== "AP" && (
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
                  {specialtyUpper === "AP" && currentPricing.plano_mensal ? (
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
                <Input type="date" required value={formDate || ""} onChange={(e) => handleDateChange(e.target.value)} />
                <Input type="time" required value={formTime || ""} onChange={(e) => handleTimeChange(e.target.value)} />
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
                {editing && form.status !== "confirmado" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full mt-1.5 h-8 gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200/60 dark:border-green-900/30 text-xs"
                    disabled={!whatsappUrl}
                    onClick={() => whatsappUrl && window.open(whatsappUrl, "_blank")}
                  >
                    <MessageCircle className="h-4 w-4 fill-green-600/10" />
                    {whatsappUrl ? "WhatsApp Paciente" : "Sem WhatsApp"}
                  </Button>
                )}
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
                        const hasFuture = editing?.recorrencia_grupo;
                        let deleteAllFuture = false;
                        if (hasFuture) {
                          deleteAllFuture = confirm(
                            "Este agendamento faz parte de uma série recorrente. Deseja excluir também todos os agendamentos futuros desta série?"
                          );
                        }
                        deleteMutation.mutate(deleteAllFuture);
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
    mutationFn: async (cancelAllFuture: boolean) => {
      if (!motivo.trim()) throw new Error("Informe o motivo");
      if (cancelAllFuture && ag.recorrencia_grupo) {
        const { error } = await supabase
          .from("agendamentos")
          .update({ status: "cancelado", motivo_cancelamento: motivo })
          .eq("recorrencia_grupo", ag.recorrencia_grupo)
          .gte("data_inicio", ag.data_inicio);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("agendamentos")
          .update({ status: "cancelado", motivo_cancelamento: motivo })
          .eq("id", ag.id);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Agendamento cancelado"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Cancelar agendamento</DialogTitle></DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const cancelAllFuture = ag.recorrencia_grupo
            ? confirm("Este agendamento faz parte de uma série recorrente. Deseja cancelar também todos os agendamentos futuros desta série?")
            : false;
          m.mutate(cancelAllFuture);
        }}
        className="space-y-3"
      >
        <p className="text-sm text-muted-foreground">Informe o motivo do cancelamento. Esta ação não pode ser desfeita.</p>
        <Textarea required value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo…" />
        <DialogFooter>
          <Button type="submit" variant="destructive" disabled={m.isPending}>Confirmar cancelamento</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
