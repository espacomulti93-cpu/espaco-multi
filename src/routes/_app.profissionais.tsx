import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profissionais")({
  component: ProfissionaisPage,
});

const CORES = ["#3b82f6", "#fb923c", "#10b981", "#a78bfa", "#ec4899", "#f59e0b", "#06b6d4", "#ef4444"];

function ProfissionaisPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data = [] } = useQuery({
    queryKey: ["profissionais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profissionais").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profissionais").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profissional removido");
      qc.invalidateQueries({ queryKey: ["profissionais"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> Novo profissional</Button>
          </DialogTrigger>
          {open && (
            <ProfForm
              prof={editing}
              onSaved={() => {
                setOpen(false);
                setEditing(null);
                qc.invalidateQueries({ queryKey: ["profissionais"] });
              }}
            />
          )}
        </Dialog>
      </div>
      {data.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhum profissional cadastrado.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-full" style={{ background: p.cor }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.nome}</div>
                    <div className="text-xs text-muted-foreground">{p.especialidade ?? "—"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {p.registro && <>Registro: {p.registro} • </>}
                      {p.valor_sessao ? `R$ ${Number(p.valor_sessao).toFixed(2)}/sessão` : "Valor não definido"}
                    </div>
                  </div>
                  <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => {
                    if (confirm(`Remover ${p.nome}?`)) del.mutate(p.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfForm({ prof, onSaved }: { prof: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: prof?.nome ?? "",
    especialidade: prof?.especialidade ?? "",
    registro: prof?.registro ?? "",
    email: prof?.email ?? "",
    telefone: prof?.telefone ?? "",
    cor: prof?.cor ?? CORES[0],
    valor_sessao: prof?.valor_sessao ?? "",
    ativo: prof?.ativo ?? true,
  });
  const m = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form, valor_sessao: form.valor_sessao ? Number(form.valor_sessao) : null };
      if (prof) {
        const { error } = await supabase.from("profissionais").update(payload).eq("id", prof.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profissionais").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(prof ? "Atualizado" : "Cadastrado"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{prof ? "Editar profissional" : "Novo profissional"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-3">
        <div className="space-y-1.5"><Label>Nome *</Label>
          <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Especialidade</Label>
            <Input value={form.especialidade} onChange={(e) => setForm({ ...form, especialidade: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Registro (CRP/CRM)</Label>
            <Input value={form.registro} onChange={(e) => setForm({ ...form, registro: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>E-mail</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Telefone</Label>
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5">
          <Label>Cor da agenda</Label>
          <div className="flex flex-wrap gap-2">
            {CORES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setForm({ ...form, cor: c })}
                className={`h-7 w-7 rounded-full ring-offset-2 transition ${form.cor === c ? "ring-2 ring-foreground" : ""}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div className="space-y-1.5"><Label>Valor por sessão (R$)</Label>
          <Input type="number" step="0.01" value={form.valor_sessao} onChange={(e) => setForm({ ...form, valor_sessao: e.target.value })} /></div>
        <DialogFooter><Button type="submit" disabled={m.isPending}>Salvar</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
