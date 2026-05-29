import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { differenceInYears, format } from "date-fns";
import { PacienteFormDialog } from "./_app.pacientes";

export const Route = createFileRoute("/_app/pacientes/$id")({
  component: PacienteDetail,
});

function PacienteDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [respOpen, setRespOpen] = useState(false);

  const { data: paciente } = useQuery({
    queryKey: ["paciente", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pacientes").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: responsaveis = [] } = useQuery({
    queryKey: ["responsaveis", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responsaveis")
        .select("*")
        .eq("paciente_id", id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: ags = [] } = useQuery({
    queryKey: ["paciente-ags", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*, profissionais(nome, cor), servicos(nome)")
        .eq("paciente_id", id)
        .order("data_inicio", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const delResp = useMutation({
    mutationFn: async (rid: string) => {
      const { error } = await supabase.from("responsaveis").delete().eq("id", rid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Responsável removido");
      qc.invalidateQueries({ queryKey: ["responsaveis", id] });
    },
  });

  if (!paciente) return <p className="text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/pacientes"><ArrowLeft className="h-4 w-4" /> Pacientes</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl">{paciente.nome}</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">
              {paciente.data_nascimento
                ? `${differenceInYears(new Date(), new Date(paciente.data_nascimento))} anos • Nasc. ${format(new Date(paciente.data_nascimento), "dd/MM/yyyy")}`
                : "Data de nascimento não informada"}
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant={paciente.status === "ativo" ? "default" : "secondary"}>
              {paciente.status.replace("_", " ")}
            </Badge>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
              </DialogTrigger>
              <PacienteFormDialog
                paciente={paciente}
                onSaved={() => {
                  setEditOpen(false);
                  qc.invalidateQueries({ queryKey: ["paciente", id] });
                  qc.invalidateQueries({ queryKey: ["pacientes"] });
                }}
              />
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Info label="CID principal" value={paciente.cid_principal} />
          <Info label="Atendimento" value={paciente.tipo_atendimento === "convenio" ? `Convênio: ${paciente.convenio_nome ?? "—"}` : "Particular"} />
          <Info label="Valor mensal" value={paciente.valor_mensal ? `R$ ${Number(paciente.valor_mensal).toFixed(2)}` : "—"} />
          <Info label="Cadastrado em" value={format(new Date(paciente.created_at), "dd/MM/yyyy")} />
          {paciente.observacoes && (
            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground">Observações</div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{paciente.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Responsáveis</CardTitle>
          <Dialog open={respOpen} onOpenChange={setRespOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </DialogTrigger>
            <ResponsavelDialog
              pacienteId={id}
              onSaved={() => {
                setRespOpen(false);
                qc.invalidateQueries({ queryKey: ["responsaveis", id] });
              }}
            />
          </Dialog>
        </CardHeader>
        <CardContent>
          {responsaveis.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum responsável cadastrado.</p>
          ) : (
            <div className="divide-y">
              {responsaveis.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{r.nome} {r.parentesco && <span className="text-muted-foreground">• {r.parentesco}</span>}</div>
                    <div className="text-xs text-muted-foreground">
                      {[r.telefone, r.whatsapp && `WhatsApp: ${r.whatsapp}`, r.email].filter(Boolean).join(" • ")}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => delResp.mutate(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de agendamentos</CardTitle></CardHeader>
        <CardContent>
          {ags.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem agendamentos.</p>
          ) : (
            <div className="divide-y">
              {ags.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <div className="h-8 w-1 rounded-full" style={{ background: a.profissionais?.cor }} />
                  <div className="min-w-[140px] font-medium">
                    {format(new Date(a.data_inicio), "dd/MM/yyyy HH:mm")}
                  </div>
                  <div className="flex-1 text-muted-foreground">
                    {a.servicos?.nome} • {a.profissionais?.nome}
                  </div>
                  <Badge variant="secondary">{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value ?? "—"}</div>
    </div>
  );
}

function ResponsavelDialog({ pacienteId, onSaved }: { pacienteId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ nome: "", parentesco: "", telefone: "", whatsapp: "", email: "" });
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("responsaveis").insert({ ...form, paciente_id: pacienteId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Responsável adicionado");
      onSaved();
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo responsável</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-3">
        <div className="space-y-1.5"><Label>Nome *</Label>
          <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Parentesco</Label>
          <Input value={form.parentesco} onChange={(e) => setForm({ ...form, parentesco: e.target.value })} placeholder="Mãe, Pai, Responsável legal…" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Telefone</Label>
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>WhatsApp</Label>
            <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label>E-mail</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <DialogFooter><Button type="submit" disabled={m.isPending}>Salvar</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
