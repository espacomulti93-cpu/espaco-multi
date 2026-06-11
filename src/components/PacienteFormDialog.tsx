import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const formatBirthDate = (value: string) => {
  const nums = value.replace(/\D/g, "");
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.substring(0, 2)}/${nums.substring(2)}`;
  return `${nums.substring(0, 2)}/${nums.substring(2, 4)}/${nums.substring(4, 8)}`;
};

export const formatBirthDateForDisplay = (dateStr: string | null | undefined) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export const formatPhone = (value: string) => {
  if (!value) return "";
  const nums = value.replace(/\D/g, "");
  if (nums.length <= 2) return nums;
  if (nums.length <= 7) return `(${nums.substring(0, 2)}) ${nums.substring(2)}`;
  return `(${nums.substring(0, 2)}) ${nums.substring(2, 7)}-${nums.substring(7, 11)}`;
};

export function PacienteFormDialog({
  paciente,
  onSaved,
  defaultSpecialty,
  defaultProfessionalId,
}: {
  paciente?: any;
  onSaved: (newPac?: any) => void;
  defaultSpecialty?: string;
  defaultProfessionalId?: string;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: paciente?.nome ?? "",
    data_nascimento: paciente?.data_nascimento
      ? formatBirthDateForDisplay(paciente.data_nascimento)
      : "",
    cid_principal: paciente?.cid_principal ?? "",
    cids_secundarios: Array.isArray(paciente?.cids_secundarios)
      ? (paciente.cids_secundarios as string[])
      : (defaultSpecialty ? [defaultSpecialty] : []),
    tipo_atendimento: paciente?.tipo_atendimento ?? "particular",
    convenio_nome: paciente?.convenio_nome ?? "",
    status: paciente?.status ?? "ativo",
    observacoes: paciente?.observacoes ?? "",
    responsavel: "",
    telefone: "",
    valor_mensal: paciente?.valor_mensal ? String(paciente.valor_mensal) : "",
  });
  const { data: profissionais = [] } = useQuery({
    queryKey: ["profissionais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profissionais").select("especialidade");
      if (error) throw error;
      return data ?? [];
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

  const { data: currentProfs = [], isSuccess: isCurrentProfsSuccess } = useQuery({
    queryKey: ["paciente-profissionais", paciente?.id],
    queryFn: async () => {
      if (!paciente?.id) return [];
      const { data, error } = await supabase
        .from("paciente_profissional")
        .select("profissional_id")
        .eq("paciente_id", paciente.id);
      if (error) throw error;
      return (data ?? []).map((d) => d.profissional_id);
    },
    enabled: !!paciente?.id,
  });

  const [selectedProfs, setSelectedProfs] = useState<string[]>([]);

  useEffect(() => {
    if (paciente?.id) {
      if (isCurrentProfsSuccess && currentProfs) {
        setSelectedProfs(currentProfs);
      }
    } else {
      if (defaultProfessionalId) {
        setSelectedProfs([defaultProfessionalId]);
      } else {
        setSelectedProfs([]);
      }
    }
  }, [currentProfs, isCurrentProfsSuccess, paciente?.id, defaultProfessionalId]);

  const availableSpecialties = Array.from(
    new Set(
      (profissionais || [])
        .flatMap((p) => {
          if (typeof p?.especialidade !== "string") return [];
          return p.especialidade.split(",").map((s) => s.trim());
        })
        .filter(Boolean),
    ),
  ) as string[];

  const { data: responsaveis = [], isSuccess: isResponsaveisSuccess } = useQuery({
    queryKey: ["responsaveis", paciente?.id],
    queryFn: async () => {
      if (!paciente?.id) return [];
      const { data, error } = await supabase
        .from("responsaveis")
        .select("*")
        .eq("paciente_id", paciente.id)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!paciente?.id,
  });

  useEffect(() => {
    if (isResponsaveisSuccess && responsaveis && responsaveis.length > 0) {
      setForm((f) => ({
        ...f,
        responsavel: responsaveis[0].nome,
        telefone: formatPhone(responsaveis[0].telefone ?? ""),
      }));
    }
  }, [responsaveis, isResponsaveisSuccess]);

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
        valor_mensal: form.valor_mensal ? Number(form.valor_mensal) : null,
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
        return { ...paciente, ...payload };
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
        return newPaciente;
      }
    },
    onSuccess: (data) => {
      toast.success(paciente ? "Paciente atualizado" : "Paciente cadastrado");
      qc.invalidateQueries({ queryKey: ["paciente-profissional-all"] });
      qc.invalidateQueries({ queryKey: ["paciente-profissionais-detail", paciente?.id] });
      qc.invalidateQueries({ queryKey: ["paciente-profissionais", paciente?.id] });
      qc.invalidateQueries({ queryKey: ["paciente-profissional"] });
      onSaved(data);
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
            {(profissionaisList || []).map((prof: any) => {
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
            {(profissionaisList || []).length === 0 && (
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

        {form.tipo_atendimento === "particular" && (
          <div className="space-y-1.5 animate-in fade-in duration-200">
            <Label>Valor Mensal (deixe em branco se for cobrança por sessão)</Label>
            <Input
              type="number"
              placeholder="Ex: 400.00"
              value={form.valor_mensal}
              onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })}
            />
          </div>
        )}

        {form.tipo_atendimento === "convenio" && (
          <div className="space-y-1.5 animate-in fade-in duration-200">
            <Label>Nome do convênio</Label>
            <Input
              value={form.convenio_nome}
              onChange={(e) => setForm({ ...form, convenio_nome: e.target.value })}
              placeholder="Nome do plano/convênio"
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
