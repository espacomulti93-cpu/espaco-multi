import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, User, Pencil } from "lucide-react";
import { toast } from "sonner";
import { differenceInYears, format } from "date-fns";

export const Route = createFileRoute("/_app/pacientes")({
  component: PacientesPage,
});

function PacientesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: pacientes = [], isLoading } = useQuery({
    queryKey: ["pacientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacientes")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const filtered = pacientes.filter((p) =>
    p.nome.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar paciente…"
            className="pl-9"
          />
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="ml-auto gap-1.5">
              <Plus className="h-4 w-4" /> Novo paciente
            </Button>
          </DialogTrigger>
          {open && (
            <PacienteFormDialog
              paciente={editing}
              onSaved={() => {
                setOpen(false);
                setEditing(null);
                qc.invalidateQueries({ queryKey: ["pacientes"] });
              }}
            />
          )}
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <User className="mx-auto mb-2 h-6 w-6 opacity-50" />
            Nenhum paciente encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                navigate({
                  to: "/pacientes/$id",
                  params: { id: p.id },
                });
              }}
              className="cursor-pointer group relative rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.data_nascimento
                      ? `${differenceInYears(new Date(), new Date(p.data_nascimento))} anos`
                      : "Idade não informada"}
                    {p.cid_principal ? ` • ${p.cid_principal}` : ""}
                  </div>
                  {p.cids_secundarios && (p.cids_secundarios as string[]).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(p.cids_secundarios as string[]).map((spec) => (
                        <Badge key={spec} variant="outline" className="text-[10px] px-1.5 py-0">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Badge variant={p.status === "ativo" ? "default" : "secondary"}>
                  {p.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <div>
                  {p.tipo_atendimento === "convenio" ? `Convênio: ${p.convenio_nome ?? "—"}` : "Particular"}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditing(p);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PacienteFormDialog({
  paciente,
  onSaved,
}: {
  paciente?: any;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nome: paciente?.nome ?? "",
    idade: paciente?.data_nascimento
      ? differenceInYears(new Date(), new Date(paciente.data_nascimento)).toString()
      : "",
    cid_principal: paciente?.cid_principal ?? "",
    cids_secundarios: (paciente?.cids_secundarios as string[]) ?? [],
    tipo_atendimento: paciente?.tipo_atendimento ?? "particular",
    convenio_nome: paciente?.convenio_nome ?? "",
    valor_mensal: paciente?.valor_mensal ?? "",
    status: paciente?.status ?? "ativo",
    observacoes: paciente?.observacoes ?? "",
    responsavel: "",
  });

  const { data: profissionais = [] } = useQuery({
    queryKey: ["profissionais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profissionais").select("especialidade");
      if (error) throw error;
      return data;
    },
  });

  const availableSpecialties = Array.from(
    new Set(
      [
        ...profissionais.flatMap((p) => p.especialidade ? p.especialidade.split(",").map(s => s.trim()) : []).filter(Boolean),
        "Psicologia",
        "Fonoaudiologia",
        "Terapia Ocupacional",
        "Psicopedagogia",
        "Fisioterapia",
      ]
    )
  ) as string[];

  const { data: responsaveis = [] } = useQuery({
    queryKey: ["responsaveis", paciente?.id],
    queryFn: async () => {
      if (!paciente?.id) return [];
      const { data, error } = await supabase
        .from("responsaveis")
        .select("*")
        .eq("paciente_id", paciente.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!paciente?.id,
  });

  useEffect(() => {
    if (responsaveis.length > 0) {
      setForm((f) => ({ ...f, responsavel: responsaveis[0].nome }));
    }
  }, [responsaveis]);

  const mutation = useMutation({
    mutationFn: async () => {
      let data_nascimento = null;
      if (form.idade) {
        const ageNum = Number(form.idade);
        const today = new Date();
        today.setFullYear(today.getFullYear() - ageNum);
        data_nascimento = today.toISOString().split("T")[0];
      }

      const payload: any = {
        nome: form.nome,
        data_nascimento,
        cid_principal: form.cid_principal || null,
        cids_secundarios: form.cids_secundarios,
        tipo_atendimento: form.tipo_atendimento,
        convenio_nome: form.tipo_atendimento === "convenio" ? form.convenio_nome : null,
        valor_mensal: form.valor_mensal ? Number(form.valor_mensal) : null,
        status: form.status,
        observacoes: form.observacoes || null,
      };

      if (paciente) {
        // Edit mode
        const { error } = await supabase.from("pacientes").update(payload).eq("id", paciente.id);
        if (error) throw error;

        if (form.responsavel.trim()) {
          if (responsaveis.length > 0) {
            const { error: rError } = await supabase
              .from("responsaveis")
              .update({ nome: form.responsavel.trim() })
              .eq("id", responsaveis[0].id);
            if (rError) throw rError;
          } else {
            const { error: rError } = await supabase
              .from("responsaveis")
              .insert({ paciente_id: paciente.id, nome: form.responsavel.trim() });
            if (rError) throw rError;
          }
        }
      } else {
        // Create mode
        const { data: newPaciente, error } = await supabase
          .from("pacientes")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;

        if (form.responsavel.trim() && newPaciente) {
          const { error: rError } = await supabase
            .from("responsaveis")
            .insert({ paciente_id: newPaciente.id, nome: form.responsavel.trim() });
          if (rError) throw rError;
        }
      }
    },
    onSuccess: () => {
      toast.success(paciente ? "Paciente atualizado" : "Paciente cadastrado");
      onSaved();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{paciente ? "Editar paciente" : "Novo paciente"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-3"
      >
        <div className="space-y-1.5">
          <Label>Nome completo *</Label>
          <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>IDADE</Label>
            <Input
              type="number"
              min="0"
              max="120"
              value={form.idade}
              onChange={(e) => setForm({ ...form, idade: e.target.value })}
              placeholder="ex.: 8"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tratamento desejado</Label>
            <Input
              value={form.cid_principal}
              onChange={(e) => setForm({ ...form, cid_principal: e.target.value })}
              placeholder="ex.: Autismo - Regulação"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Especialidades desejadas</Label>
          <div className="flex flex-wrap gap-2">
            {availableSpecialties.map((spec) => {
              const selected = form.cids_secundarios.includes(spec);
              return (
                <button
                  type="button"
                  key={spec}
                  onClick={() => {
                    const next = selected
                      ? form.cids_secundarios.filter((s) => s !== spec)
                      : [...form.cids_secundarios, spec];
                    setForm({ ...form, cids_secundarios: next });
                  }}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium border transition ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {spec}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Responsável</Label>
          <Input
            value={form.responsavel}
            onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
            placeholder="Nome do pai, mãe ou responsável legal"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tipo de atendimento</Label>
            <Select value={form.tipo_atendimento} onValueChange={(v) => setForm({ ...form, tipo_atendimento: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="particular">Particular</SelectItem>
                <SelectItem value="convenio">Convênio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="lista_espera">Lista de espera</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {form.tipo_atendimento === "convenio" && (
          <div className="space-y-1.5">
            <Label>Nome do convênio</Label>
            <Input value={form.convenio_nome} onChange={(e) => setForm({ ...form, convenio_nome: e.target.value })} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Valor mensal (R$)</Label>
          <Input
            type="number"
            step="0.01"
            value={form.valor_mensal}
            onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Observações clínicas</Label>
          <Textarea
            rows={3}
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
