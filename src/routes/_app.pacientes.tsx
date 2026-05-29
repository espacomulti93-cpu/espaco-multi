import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
import { Plus, Search, User } from "lucide-react";
import { toast } from "sonner";
import { differenceInYears, format } from "date-fns";

export const Route = createFileRoute("/_app/pacientes")({
  component: PacientesPage,
});

function PacientesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="ml-auto gap-1.5">
              <Plus className="h-4 w-4" /> Novo paciente
            </Button>
          </DialogTrigger>
          <PacienteFormDialog
            onSaved={() => {
              setOpen(false);
              qc.invalidateQueries({ queryKey: ["pacientes"] });
            }}
          />
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
            <Link
              key={p.id}
              to="/pacientes/$id"
              params={{ id: p.id }}
              className="rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
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
                </div>
                <Badge variant={p.status === "ativo" ? "default" : "secondary"}>
                  {p.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {p.tipo_atendimento === "convenio" ? `Convênio: ${p.convenio_nome ?? "—"}` : "Particular"}
              </div>
            </Link>
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
    data_nascimento: paciente?.data_nascimento ?? "",
    cid_principal: paciente?.cid_principal ?? "",
    tipo_atendimento: paciente?.tipo_atendimento ?? "particular",
    convenio_nome: paciente?.convenio_nome ?? "",
    valor_mensal: paciente?.valor_mensal ?? "",
    status: paciente?.status ?? "ativo",
    observacoes: paciente?.observacoes ?? "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...form,
        data_nascimento: form.data_nascimento || null,
        valor_mensal: form.valor_mensal ? Number(form.valor_mensal) : null,
      };
      if (paciente) {
        const { error } = await supabase.from("pacientes").update(payload).eq("id", paciente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pacientes").insert(payload);
        if (error) throw error;
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
            <Label>Data de nascimento</Label>
            <Input
              type="date"
              value={form.data_nascimento}
              onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>CID principal</Label>
            <Input
              value={form.cid_principal}
              onChange={(e) => setForm({ ...form, cid_principal: e.target.value })}
              placeholder="ex.: F84.0"
            />
          </div>
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
