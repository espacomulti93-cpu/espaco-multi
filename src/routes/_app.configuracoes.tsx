import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/configuracoes")({
  component: Config,
});

function Config() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SimpleCrud
        title="Serviços"
        table="servicos"
        fields={[
          { key: "nome", label: "Nome", required: true },
          { key: "duracao_minutos", label: "Duração (min)", type: "number" },
          { key: "cor", label: "Cor", type: "color" },
        ]}
      />
      <SimpleCrud
        title="Salas"
        table="salas"
        fields={[{ key: "nome", label: "Nome", required: true }]}
      />
    </div>
  );
}

function SimpleCrud({
  title,
  table,
  fields,
}: {
  title: string;
  table: "servicos" | "salas";
  fields: { key: string; label: string; required?: boolean; type?: string }[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const initial = Object.fromEntries(fields.map((f) => [f.key, f.type === "color" ? "#3b82f6" : ""]));
  const [form, setForm] = useState<any>(initial);

  const { data = [] } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form };
      if (payload.duracao_minutos) payload.duracao_minutos = Number(payload.duracao_minutos);
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Salvo");
      setForm(initial);
      setOpen(false);
      qc.invalidateQueries({ queryKey: [table] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: [table] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-4 w-4" />Novo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo {title.slice(0, -1).toLowerCase()}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}{f.required && " *"}</Label>
                  <Input
                    type={f.type ?? "text"}
                    required={f.required}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                </div>
              ))}
              <DialogFooter><Button type="submit" disabled={create.isPending}>Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cadastro.</p>
        ) : (
          <div className="divide-y">
            {data.map((it: any) => (
              <div key={it.id} className="flex items-center gap-3 py-2.5 text-sm">
                {it.cor && <div className="h-4 w-4 rounded" style={{ background: it.cor }} />}
                <div className="flex-1">
                  <div className="font-medium">{it.nome}</div>
                  {it.duracao_minutos && <div className="text-xs text-muted-foreground">{it.duracao_minutos} min</div>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Remover "${it.nome}"?`)) del.mutate(it.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
