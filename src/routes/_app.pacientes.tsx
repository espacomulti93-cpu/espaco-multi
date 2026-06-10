import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, User, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { differenceInYears, format } from "date-fns";

const formatBirthDate = (value: string) => {
  const nums = value.replace(/\D/g, "");
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.substring(0, 2)}/${nums.substring(2)}`;
  return `${nums.substring(0, 2)}/${nums.substring(2, 4)}/${nums.substring(4, 8)}`;
};

const formatBirthDateForDisplay = (dateStr: string | null | undefined) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export const Route = createFileRoute("/_app/pacientes")({
  component: PacientesPage,
});

function PacientesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: pacientes = [], isLoading } = useQuery({
    queryKey: ["pacientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pacientes").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: pacienteProfissionais = [] } = useQuery({
    queryKey: ["paciente-profissional-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paciente_profissional")
        .select("paciente_id, profissional_id, profissionais(nome, cor)");
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // 1. Delete fatura_itens for faturas belonging to these patients
      const { data: faturas } = await supabase.from("faturas").select("id").in("paciente_id", ids);
      const faturaIds = faturas?.map((f) => f.id) || [];
      if (faturaIds.length > 0) {
        await supabase.from("fatura_itens").delete().in("fatura_id", faturaIds);
      }
      // 2. Delete faturas
      await supabase.from("faturas").delete().in("paciente_id", ids);
      // 3. Delete agendamentos
      await supabase.from("agendamentos").delete().in("paciente_id", ids);
      // 4. Delete responsaveis
      await supabase.from("responsaveis").delete().in("paciente_id", ids);
      // 5. Delete patients
      const { error } = await supabase.from("pacientes").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente(s) excluído(s) com sucesso");
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ["pacientes"] });
    },
    onError: (e: any) => {
      toast.error("Erro ao excluir paciente(s): " + e.message);
    },
  });

  const handleDeleteSingle = (p: any) => {
    if (confirm(`Tem certeza que deseja excluir o paciente ${p.nome}?`)) {
      deleteMutation.mutate([p.id]);
    }
  };

  const handleDeleteMultiple = () => {
    if (
      confirm(`Tem certeza que deseja excluir os ${selectedIds.length} pacientes selecionados?`)
    ) {
      deleteMutation.mutate(selectedIds);
    }
  };

  const filtered = pacientes.filter((p) => p.nome.toLowerCase().includes(q.toLowerCase()));

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

        {filtered.length > 0 && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={selectedIds.length === filtered.length && filtered.length > 0}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedIds(filtered.map((p) => p.id));
                } else {
                  setSelectedIds([]);
                }
              }}
            />
            <Label
              htmlFor="select-all"
              className="text-xs cursor-pointer text-muted-foreground select-none"
            >
              Selecionar tudo
            </Label>
          </div>
        )}

        {selectedIds.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={handleDeleteMultiple}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4" /> Excluir selecionados ({selectedIds.length})
          </Button>
        )}

        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
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
          {filtered.map((p) => {
            const isSelected = selectedIds.includes(p.id);
            return (
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
                <div className="flex items-start gap-3">
                  <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds([...selectedIds, p.id]);
                        } else {
                          setSelectedIds(selectedIds.filter((id) => id !== p.id));
                        }
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{p.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.data_nascimento
                            ? `Nasc.: ${formatBirthDateForDisplay(p.data_nascimento)}`
                            : "Data de nascimento não informada"}
                          {p.cid_principal ? ` • CID: ${p.cid_principal}` : ""}
                        </div>
                      </div>
                      <Badge variant={p.status === "ativo" ? "default" : "secondary"}>
                        {p.status.replace("_", " ")}
                      </Badge>
                    </div>
                    {p.cids_secundarios && (p.cids_secundarios as string[]).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(p.cids_secundarios as string[]).map((cid) => (
                          <Badge
                            key={cid}
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 bg-secondary/30"
                          >
                            {cid}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {(() => {
                      const profs = pacienteProfissionais.filter((m: any) => m.paciente_id === p.id);
                      if (profs.length === 0) return null;
                      return (
                        <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                          {profs.map((item: any) => (
                            <Badge
                              key={item.profissional_id}
                              variant="secondary"
                              className="text-[9px] px-1.5 py-0 border-l-[3px]"
                              style={{ borderLeftColor: item.profissionais?.cor || "var(--primary)" }}
                            >
                              {item.profissionais?.nome}
                            </Badge>
                          ))}
                        </div>
                      );
                    })()}
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div>
                        {p.tipo_atendimento === "convenio"
                          ? `Convênio: ${p.convenio_nome ?? "—"}`
                          : "Particular"}
                      </div>
                      <div className="flex gap-1">
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
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteSingle(p);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const formatPhone = (value: string) => {
  if (!value) return "";
  const nums = value.replace(/\D/g, "");
  if (nums.length <= 2) return nums;
  if (nums.length <= 7) return `(${nums.substring(0, 2)}) ${nums.substring(2)}`;
  return `(${nums.substring(0, 2)}) ${nums.substring(2, 7)}-${nums.substring(7, 11)}`;
};

export function PacienteFormDialog({ paciente, onSaved }: { paciente?: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: paciente?.nome ?? "",
    data_nascimento: paciente?.data_nascimento
      ? formatBirthDateForDisplay(paciente.data_nascimento)
      : "",
    cid_principal: paciente?.cid_principal ?? "",
    cids_secundarios: (paciente?.cids_secundarios as string[]) ?? [],
    tipo_atendimento: paciente?.tipo_atendimento ?? "particular",
    convenio_nome: paciente?.convenio_nome ?? "",
    status: paciente?.status ?? "ativo",
    observacoes: paciente?.observacoes ?? "",
    responsavel: "",
    telefone: "",
  });

  const { data: profissionais = [] } = useQuery({
    queryKey: ["profissionais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profissionais").select("especialidade");
      if (error) throw error;
      return data;
    },
  });

  const { data: profissionaisList = [] } = useQuery({
    queryKey: ["profissionais-list-form"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id, nome, cor, especialidade")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: currentProfs = [] } = useQuery({
    queryKey: ["paciente-profissionais", paciente?.id],
    queryFn: async () => {
      if (!paciente?.id) return [];
      const { data, error } = await supabase
        .from("paciente_profissional")
        .select("profissional_id")
        .eq("paciente_id", paciente.id);
      if (error) throw error;
      return data.map((d) => d.profissional_id);
    },
    enabled: !!paciente?.id,
  });

  const [selectedProfs, setSelectedProfs] = useState<string[]>([]);

  useEffect(() => {
    if (currentProfs.length > 0) {
      setSelectedProfs(currentProfs);
    } else {
      setSelectedProfs([]);
    }
  }, [currentProfs]);

  const availableSpecialties = Array.from(
    new Set(
      profissionais
        .flatMap((p) => (p.especialidade ? p.especialidade.split(",").map((s) => s.trim()) : []))
        .filter(Boolean),
    ),
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
      setForm((f) => ({
        ...f,
        responsavel: responsaveis[0].nome,
        telefone: formatPhone(responsaveis[0].telefone ?? ""),
      }));
    }
  }, [responsaveis]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setForm((f) => ({ ...f, telefone: formatted }));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (form.telefone.trim() && !form.responsavel.trim()) {
        throw new Error("O nome do responsável é obrigatório quando o telefone é informado.");
      }

      let dbBirthDate: string | null = null;
      if (form.data_nascimento) {
        const parts = form.data_nascimento.split("/");
        if (
          parts.length !== 3 ||
          parts[0].length !== 2 ||
          parts[1].length !== 2 ||
          parts[2].length !== 4
        ) {
          throw new Error("Data de nascimento inválida. Use o formato DD/MM/AAAA.");
        }
        dbBirthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      const payload: any = {
        nome: form.nome,
        data_nascimento: dbBirthDate,
        cid_principal: form.cid_principal || null,
        cids_secundarios: form.cids_secundarios,
        tipo_atendimento: form.tipo_atendimento,
        convenio_nome: form.tipo_atendimento === "convenio" ? form.convenio_nome : null,
        status: form.status,
        observacoes: form.observacoes || null,
      };

      if (paciente) {
        // Edit mode
        const { error } = await supabase.from("pacientes").update(payload).eq("id", paciente.id);
        if (error) throw error;

        // Clear existing mappings
        await supabase.from("paciente_profissional").delete().eq("paciente_id", paciente.id);
        
        // Insert new mappings
        if (selectedProfs.length > 0) {
          const mappings = selectedProfs.map((profId) => ({
            paciente_id: paciente.id,
            profissional_id: profId,
          }));
          const { error: ppError } = await supabase.from("paciente_profissional").insert(mappings);
          if (ppError) throw ppError;
        }

        if (responsaveis.length > 0) {
          if (!form.responsavel.trim() && !form.telefone.trim()) {
            // Delete existing responsible person if both fields are cleared
            const { error: rError } = await supabase
              .from("responsaveis")
              .delete()
              .eq("id", responsaveis[0].id);
            if (rError) throw rError;
          } else {
            // Update existing responsible person if name is provided
            const { error: rError } = await supabase
              .from("responsaveis")
              .update({
                nome: form.responsavel.trim(),
                telefone: form.telefone.trim() || null,
              })
              .eq("id", responsaveis[0].id);
            if (rError) throw rError;
          }
        } else if (form.responsavel.trim()) {
          // Insert new responsible person if name is provided and none existed
          const { error: rError } = await supabase.from("responsaveis").insert({
            paciente_id: paciente.id,
            nome: form.responsavel.trim(),
            telefone: form.telefone.trim() || null,
          });
          if (rError) throw rError;
        }
      } else {
        // Create mode
        const { data: newPaciente, error } = await supabase
          .from("pacientes")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;

        // Insert new mappings
        if (selectedProfs.length > 0 && newPaciente) {
          const mappings = selectedProfs.map((profId) => ({
            paciente_id: newPaciente.id,
            profissional_id: profId,
          }));
          const { error: ppError } = await supabase.from("paciente_profissional").insert(mappings);
          if (ppError) throw ppError;
        }

        if (form.responsavel.trim() && newPaciente) {
          const { error: rError } = await supabase.from("responsaveis").insert({
            paciente_id: newPaciente.id,
            nome: form.responsavel.trim(),
            telefone: form.telefone.trim() || null,
          });
          if (rError) throw rError;
        }
      }
    },
    onSuccess: () => {
      toast.success(paciente ? "Paciente atualizado" : "Paciente cadastrado");
      qc.invalidateQueries({ queryKey: ["paciente-profissional-all"] });
      qc.invalidateQueries({ queryKey: ["paciente-profissionais-detail", paciente?.id] });
      qc.invalidateQueries({ queryKey: ["paciente-profissionais", paciente?.id] });
      qc.invalidateQueries({ queryKey: ["paciente-profissional"] });
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
          <Input
            required
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Data de Nascimento</Label>
            <Input
              type="text"
              value={form.data_nascimento}
              onChange={(e) =>
                setForm({ ...form, data_nascimento: formatBirthDate(e.target.value) })
              }
              placeholder="DD/MM/AAAA"
              maxLength={10}
            />
          </div>
          <div className="space-y-1.5">
            <Label>CID(s)</Label>
            <Input
              value={form.cid_principal}
              onChange={(e) => setForm({ ...form, cid_principal: e.target.value })}
              placeholder="ex.: F84.0, F84.5"
            />
          </div>
        </div>
        <div className="space-y-1.5 animate-in fade-in duration-200">
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
        <div className="space-y-1.5 animate-in fade-in duration-200">
          <Label>Profissionais Acompanhantes</Label>
          <div className="flex flex-wrap gap-2">
            {profissionaisList.map((prof: any) => {
              const selected = selectedProfs.includes(prof.id);
              return (
                <button
                  type="button"
                  key={prof.id}
                  onClick={() => {
                    const next = selected
                      ? selectedProfs.filter((id) => id !== prof.id)
                      : [...selectedProfs, prof.id];
                    setSelectedProfs(next);
                  }}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium border transition ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full mr-1.5 shrink-0"
                    style={{ backgroundColor: prof.cor || "var(--primary)" }}
                  />
                  {prof.nome}
                </button>
              );
            })}
            {profissionaisList.length === 0 && (
              <span className="text-xs text-muted-foreground italic">Nenhum profissional ativo cadastrado.</span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Input
              value={form.responsavel}
              onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
              placeholder="Nome do pai, mãe ou responsável legal"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input
              value={form.telefone}
              onChange={handlePhoneChange}
              placeholder="(XX) XXXXX-XXXX"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tipo de atendimento</Label>
            <Select
              value={form.tipo_atendimento}
              onValueChange={(v) => setForm({ ...form, tipo_atendimento: v as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="particular">Particular</SelectItem>
                <SelectItem value="convenio">Convênio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
            <Input
              value={form.convenio_nome}
              onChange={(e) => setForm({ ...form, convenio_nome: e.target.value })}
            />
          </div>
        )}

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
