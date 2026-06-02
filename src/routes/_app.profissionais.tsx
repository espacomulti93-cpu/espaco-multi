import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, DollarSign, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/profissionais")({
  component: ProfissionaisPage,
});

const CORES = ["#3b82f6", "#fb923c", "#10b981", "#a78bfa", "#ec4899", "#f59e0b", "#06b6d4", "#ef4444"];

const PLANOS_AP = [
  { label: "1x na semana: R$ 240,00", value: "240" },
  { label: "2x na semana: R$ 360,00", value: "360" },
  { label: "Semana inteira: R$ 450,00", value: "450" },
];

function ProfissionaisPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [valuesOpen, setValuesOpen] = useState(false);
  const [editingValues, setEditingValues] = useState<any>(null);

  const { data = [] } = useQuery({
    queryKey: ["profissionais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profissionais").select("*").order("cor").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: pacientes = [] } = useQuery({
    queryKey: ["pacientes-nomes"],
    queryFn: async () => (await supabase.from("pacientes").select("id, nome")).data ?? [],
  });

  const [orderedData, setOrderedData] = useState<any[]>([]);

  useEffect(() => {
    if (data.length > 0) {
      const savedOrder = localStorage.getItem("profissionais_ordem");
      if (savedOrder) {
        const orderIds = JSON.parse(savedOrder);
        const sorted = [...data].sort((a, b) => {
          const idxA = orderIds.indexOf(a.id);
          const idxB = orderIds.indexOf(b.id);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
        setOrderedData(sorted);
      } else {
        setOrderedData(data);
      }
    } else {
      setOrderedData([]);
    }
  }, [data]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData("text/plain");
    if (!sourceIndexStr) return;
    const sourceIndex = parseInt(sourceIndexStr, 10);
    if (sourceIndex === targetIndex) return;

    const items = [...orderedData];
    const [reorderedItem] = items.splice(sourceIndex, 1);
    items.splice(targetIndex, 0, reorderedItem);

    setOrderedData(items);
    const orderIds = items.map((p) => p.id);
    localStorage.setItem("profissionais_ordem", JSON.stringify(orderIds));
  };

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
      <div className="flex justify-end gap-2">
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
        <Dialog open={valuesOpen} onOpenChange={(o) => { setValuesOpen(o); if (!o) setEditingValues(null); }}>
          {valuesOpen && (
            <ValoresDialog
              prof={editingValues}
              onSaved={() => {
                setValuesOpen(false);
                setEditingValues(null);
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
          {orderedData.map((p, idx) => (
            <Card 
              key={p.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
              className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative group"
            >
              <CardContent className="p-4">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-full" style={{ background: p.cor }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.nome}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.especialidade ? (
                        p.especialidade.split(",").map((s: string) => s.trim()).filter(Boolean).map((esp: string) => (
                          <Badge key={esp} variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                            {esp}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      {p.valores_config && (p.valores_config as any).especialidades?.length > 0 ? (
                        (p.valores_config as any).especialidades
                          .filter((esp: any) => {
                            const activeSpecs = p.especialidade
                              ? p.especialidade.split(",").map((s: string) => s.trim().toLowerCase())
                              : [];
                            return activeSpecs.includes(esp.nome.toLowerCase());
                          })
                          .map((esp: any) => {
                            if (esp.nome.toUpperCase() === "AP") {
                              const plano = PLANOS_AP.find((pl) => pl.value === String(esp.plano_mensal));
                              return (
                                <div key={esp.nome} className="text-xs text-muted-foreground flex justify-between gap-4">
                                  <span className="font-semibold">AP:</span>
                                  <span className="font-medium text-foreground">
                                    {plano ? plano.label : "Plano não configurado"}
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <div key={esp.nome} className="text-xs text-muted-foreground flex justify-between gap-4">
                                <span>{esp.nome}:</span>
                                <span className="font-medium text-foreground">
                                  Sessão R$ {Number(p.valor_sessao ?? esp.valor_sessao ?? 0).toFixed(2)} | Anamnese R$ {Number(esp.valor_avaliacao ?? 0).toFixed(2)}
                                </span>
                              </div>
                            );
                          })
                      ) : p.valor_sessao ? (
                        <div className="text-xs text-muted-foreground">
                          Geral: R$ {Number(p.valor_sessao).toFixed(2)}/sessão
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">Valores não configurados</div>
                      )}
                    </div>
                    {p.valores_config && (p.valores_config as any).descontos?.length > 0 && (
                      <div className="mt-2 pt-2 border-t text-[11px] text-muted-foreground space-y-0.5">
                        <span className="font-semibold text-foreground block">Descontos ativos:</span>
                        {(p.valores_config as any).descontos.map((d: any, idx: number) => {
                          const pac = pacientes.find((pac: any) => pac.id === d.paciente_id);
                          return (
                            <div key={idx} className="flex justify-between text-[10px] text-muted-foreground">
                              <span>{pac?.nome || "Carregando..."} ({d.especialidade})</span>
                              <span>R$ {Number(d.valor_sessao ?? 0).toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <Badge variant={p.ativo ? "default" : "secondary"} onDragStart={(e) => e.stopPropagation()}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <div className="mt-4 flex justify-between items-center gap-2" onDragStart={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs"
                    onClick={() => { setEditingValues(p); setValuesOpen(true); }}
                  >
                    <DollarSign className="h-3.5 w-3.5" /> Valores
                  </Button>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setEditing(p); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => {
                      if (confirm(`Remover ${p.nome}?`)) del.mutate(p.id);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
    especialidades: prof?.especialidade ? prof.especialidade.split(", ").filter(Boolean) : [""],
    email: prof?.email ?? "",
    telefone: prof?.telefone ?? "",
    cor: prof?.cor ?? CORES[0],
    valor_sessao: prof?.valor_sessao ?? "",
    ativo: prof?.ativo ?? true,
  });
  const m = useMutation({
    mutationFn: async () => {
      const payload: any = {
        nome: form.nome,
        especialidade: form.especialidades.map((s: string) => s.trim()).filter(Boolean).join(", ") || null,
        email: form.email || null,
        telefone: form.telefone || null,
        cor: form.cor,
        valor_sessao: form.valor_sessao ? Number(form.valor_sessao) : null,
        ativo: form.ativo,
      };
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
        
        <div className="space-y-1.5">
          <Label>Especialidades</Label>
          <div className="space-y-2">
            {form.especialidades.map((esp: string, index: number) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  value={esp}
                  onChange={(e) => {
                    const next = [...form.especialidades];
                    next[index] = e.target.value;
                    setForm({ ...form, especialidades: next });
                  }}
                  placeholder={`Especialidade ${index + 1}`}
                />
                {form.especialidades.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setForm({
                        ...form,
                        especialidades: form.especialidades.filter((_: string, i: number) => i !== index),
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1"
            onClick={() => setForm({ ...form, especialidades: [...form.especialidades, ""] })}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Adicionar especialidade
          </Button>
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

const parseMoneyValue = (val: any) => {
  if (val === undefined || val === null || val === "") return null;
  const cleaned = String(val).replace(",", ".").trim();
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
};

export function ValoresDialog({ prof, onSaved }: { prof: any; onSaved: () => void }) {
  const { data: pacientes = [] } = useQuery({
    queryKey: ["pacientes-min-prof"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pacientes").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const specs = prof?.especialidade
    ? prof.especialidade.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];

  const config = prof?.valores_config as any || { especialidades: [], descontos: [] };

  const [valoresSpecs, setValoresSpecs] = useState(() => {
    return specs.map((spec: string) => {
      const existing = config.especialidades?.find((e: any) => e.nome === spec);
      return {
        nome: spec,
        valor_sessao: existing?.valor_sessao !== undefined && existing?.valor_sessao !== null ? String(existing.valor_sessao) : "",
        valor_avaliacao: existing?.valor_avaliacao !== undefined && existing?.valor_avaliacao !== null ? String(existing.valor_avaliacao) : "",
        plano_mensal: existing?.plano_mensal !== undefined && existing?.plano_mensal !== null ? String(existing.plano_mensal) : "",
      };
    });
  });

  const [descontos, setDescontos] = useState(() => {
    return config.descontos || [];
  });

  const [newDesc, setNewDesc] = useState({
    paciente_id: "",
    especialidade: specs[0] || "",
    valor_sessao: "",
    valor_avaliacao: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payloadConfig = {
        especialidades: valoresSpecs.map((v: any) => ({
          nome: v.nome,
          valor_sessao: v.nome.toUpperCase() === "AP" ? null : (prof?.valor_sessao !== undefined && prof?.valor_sessao !== null ? parseMoneyValue(prof.valor_sessao) : null),
          valor_avaliacao: v.nome.toUpperCase() === "AP" ? null : parseMoneyValue(v.valor_avaliacao),
          plano_mensal: v.nome.toUpperCase() === "AP" ? (v.plano_mensal || null) : null,
        })),
        descontos: descontos.map((d: any) => ({
          paciente_id: d.paciente_id,
          especialidade: d.especialidade,
          valor_sessao: parseMoneyValue(d.valor_sessao),
          valor_avaliacao: parseMoneyValue(d.valor_avaliacao),
        })),
      };
      const { error } = await supabase
        .from("profissionais")
        .update({ valores_config: payloadConfig })
        .eq("id", prof.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Valores e descontos salvos");
      onSaved();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
      <DialogHeader>
        <DialogTitle>Configurar Valores - {prof.nome}</DialogTitle>
      </DialogHeader>
      
      {specs.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Cadastre especialidades para este profissional antes de configurar os valores.
        </div>
      ) : (
        <Tabs defaultValue="valores" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="valores">Valores por Especialidade</TabsTrigger>
            <TabsTrigger value="descontos">Descontos por Paciente</TabsTrigger>
          </TabsList>
          
          <TabsContent value="valores" className="flex-1 overflow-y-auto py-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Defina o valor cobrado por anamnese para cada especialidade. O valor da sessão padrão é obtido do cadastro do profissional.
            </p>
            <div className="space-y-3">
              {valoresSpecs.map((v: any, i: number) => (
                <div key={v.nome} className="grid grid-cols-3 gap-4 items-end border p-3.5 rounded-lg bg-card shadow-sm">
                  <div>
                    <Label className="text-sm font-semibold">{v.nome}</Label>
                  </div>
                  {v.nome.toUpperCase() === "AP" ? (
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Plano Mensal (AP)</Label>
                      <Select
                        value={v.plano_mensal}
                        onValueChange={(val) => {
                          const copy = [...valoresSpecs];
                          copy[i].plano_mensal = val;
                          setValoresSpecs(copy);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione um plano..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PLANOS_AP.map((plano) => (
                            <SelectItem key={plano.value} value={plano.value}>
                              {plano.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Sessão Padrão (R$)</Label>
                        <Input
                          type="text"
                          disabled
                          placeholder="Não definido"
                          value={prof?.valor_sessao !== undefined && prof?.valor_sessao !== null ? Number(prof.valor_sessao).toFixed(2) : ""}
                          className="bg-muted text-muted-foreground cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Anamnese (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Ex.: 200.00"
                          value={v.valor_avaliacao}
                          onChange={(e) => {
                            const copy = [...valoresSpecs];
                            copy[i].valor_avaliacao = e.target.value;
                            setValoresSpecs(copy);
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="descontos" className="flex-1 overflow-y-auto py-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Configure descontos e valores especiais de sessões e anamneses para pacientes selecionados.
            </p>
            
            <div className="grid grid-cols-2 gap-3 p-3 border border-dashed rounded-lg bg-muted/40">
              <div className="space-y-1.5">
                <Label>Paciente</Label>
                <Select value={newDesc.paciente_id} onValueChange={(v) => setNewDesc({ ...newDesc, paciente_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {pacientes.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Especialidade</Label>
                <Select value={newDesc.especialidade} onValueChange={(v) => setNewDesc({ ...newDesc, especialidade: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {specs.map((s: string) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor Sessão (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex.: 120"
                  value={newDesc.valor_sessao}
                  onChange={(e) => setNewDesc({ ...newDesc, valor_sessao: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor Anamnese (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex.: 180"
                  value={newDesc.valor_avaliacao}
                  onChange={(e) => setNewDesc({ ...newDesc, valor_avaliacao: e.target.value })}
                />
              </div>
              <div className="col-span-2 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!newDesc.paciente_id || !newDesc.especialidade || !newDesc.valor_sessao || !newDesc.valor_avaliacao) {
                      toast.error("Preencha todos os campos do desconto");
                      return;
                    }
                    const newRule = {
                      paciente_id: newDesc.paciente_id,
                      especialidade: newDesc.especialidade,
                      valor_sessao: parseMoneyValue(newDesc.valor_sessao) ?? 0,
                      valor_avaliacao: parseMoneyValue(newDesc.valor_avaliacao) ?? 0,
                    };
                    const exists = descontos.some(
                      (d: any) => d.paciente_id === newRule.paciente_id && d.especialidade === newRule.especialidade
                    );
                    if (exists) {
                      toast.error("Já existe desconto para este paciente nesta especialidade");
                      return;
                    }
                    setDescontos([...descontos, newRule]);
                    setNewDesc({ paciente_id: "", especialidade: specs[0] || "", valor_sessao: "", valor_avaliacao: "" });
                  }}
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Adicionar Desconto
                </Button>
              </div>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <Table className="w-full">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead>Sessão</TableHead>
                    <TableHead>Anamnese</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {descontos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                        Nenhum valor com desconto cadastrado para este profissional.
                      </TableCell>
                    </TableRow>
                  ) : (
                    descontos.map((d: any, idx: number) => {
                      const pac = pacientes.find((p: any) => p.id === d.paciente_id);
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium text-xs">{pac?.nome || "Carregando..."}</TableCell>
                          <TableCell className="text-xs">{d.especialidade}</TableCell>
                          <TableCell className="text-xs font-semibold text-primary">R$ {Number(d.valor_sessao ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="text-xs font-semibold text-primary">R$ {Number(d.valor_avaliacao ?? 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDescontos(descontos.filter((_: any, i: number) => i !== idx))}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      )}
      
      <DialogFooter className="mt-4 shrink-0">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Salvar Configuração"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
