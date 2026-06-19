import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useRef, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Lock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Printer,
  Calendar,
  User,
  Trash2,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/frequencia")({
  component: FrequenciaPage,
});

// Signature pad component using W3C Pointer Events
function SignaturePad({
  onSave,
  onCancel,
}: {
  onSave: (base64: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#1e293b"; // slate-800
  }, []);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg bg-slate-50 overflow-hidden relative shadow-inner">
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          className="w-full h-44 cursor-crosshair touch-none"
        />
        <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground select-none pointer-events-none font-medium">
          Assine com o dedo ou caneta touch
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clearCanvas}>
          Limpar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={handleSave} className="gap-1.5">
          Confirmar Assinatura
        </Button>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  realizado: "Realizado",
  falta: "Falta",
  pago: "Pago",
};

function FrequenciaPage() {
  const qc = useQueryClient();
  const today = new Date();
  const [selectedProfId, setSelectedProfId] = useState<string>("");
  const [inicio, setInicio] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [fim, setFim] = useState(format(endOfMonth(today), "yyyy-MM-dd"));

  // Dialog States
  const [signDialog, setSignDialog] = useState<{ open: boolean; ag: any }>({
    open: false,
    ag: null,
  });
  const [viewSignDialog, setViewSignDialog] = useState<{ open: boolean; ag: any }>({
    open: false,
    ag: null,
  });
  const [reportDialog, setReportDialog] = useState({
    open: false,
    pacienteId: "",
    mesComp: format(today, "yyyy-MM"),
  });

  const [nomeResponsavel, setNomeResponsavel] = useState("");

  // Fetch Professionals
  const { data: profissionais = [] } = useQuery({
    queryKey: ["freq-profissionais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id, nome, especialidade, cor")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch Appointments
  const { data: agendamentos = [], isLoading: loadingAgs } = useQuery({
    queryKey: ["freq-agendamentos", selectedProfId, inicio, fim],
    queryFn: async () => {
      if (!selectedProfId) return [];
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*, pacientes(nome), profissionais(nome), servicos(nome)")
        .eq("profissional_id", selectedProfId)
        .gte("data_inicio", `${inicio}T00:00:00`)
        .lte("data_inicio", `${fim}T23:59:59`)
        .order("data_inicio", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedProfId,
  });

  // Fetch all Patients who have sessions for reporting dropdown
  const reportPatients = useMemo(() => {
    const map = new Map<string, string>();
    agendamentos.forEach((a: any) => {
      if (a.paciente_id && a.pacientes?.nome) {
        map.set(a.paciente_id, a.pacientes.nome);
      }
    });
    return Array.from(map.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [agendamentos]);

  // Sign Attendance Mutation
  const signMutation = useMutation({
    mutationFn: async ({
      agId,
      signatureBase64,
      name,
    }: {
      agId: string;
      signatureBase64: string;
      name: string;
    }) => {
      const { data, error } = await supabase
        .from("agendamentos")
        .update({
          assinatura_responsavel: signatureBase64,
          nome_assinante: name,
          data_assinatura: new Date().toISOString(),
        } as any)
        .eq("id", agId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["freq-agendamentos"] });
      toast.success("Frequência assinada com sucesso!");
      setSignDialog({ open: false, ag: null });
      setNomeResponsavel("");
    },
    onError: (err: any) => {
      console.error(err);
      toast.error("Erro ao registrar assinatura: " + err.message);
    },
  });

  // Clear Signature Mutation
  const clearSignatureMutation = useMutation({
    mutationFn: async (agId: string) => {
      const { data, error } = await supabase
        .from("agendamentos")
        .update({
          assinatura_responsavel: null,
          nome_assinante: null,
          data_assinatura: null,
        } as any)
        .eq("id", agId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["freq-agendamentos"] });
      toast.success("Assinatura removida.");
      setViewSignDialog({ open: false, ag: null });
    },
    onError: (err: any) => {
      console.error(err);
      toast.error("Erro ao remover assinatura: " + err.message);
    },
  });

  const handleOpenSign = (ag: any) => {
    setNomeResponsavel("");
    setSignDialog({ open: true, ag });
  };

  const handleSaveSignature = (base64: string) => {
    if (!nomeResponsavel.trim()) {
      toast.error("Por favor, digite o nome do responsável.");
      return;
    }
    if (!signDialog.ag) return;
    signMutation.mutate({
      agId: signDialog.ag.id,
      signatureBase64: base64,
      name: nomeResponsavel.trim(),
    });
  };

  // Report view calculations
  const reportData = useMemo(() => {
    if (!reportDialog.pacienteId || !reportDialog.mesComp) return [];
    const [year, month] = reportDialog.mesComp.split("-");
    const mStart = startOfMonth(new Date(Number(year), Number(month) - 1));
    const mEnd = endOfMonth(new Date(Number(year), Number(month) - 1));

    return agendamentos
      .filter((a: any) => {
        const d = new Date(a.data_inicio);
        return (
          a.paciente_id === reportDialog.pacienteId &&
          d >= mStart &&
          d <= mEnd &&
          a.status !== "cancelado"
        );
      })
      .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());
  }, [agendamentos, reportDialog.pacienteId, reportDialog.mesComp]);

  const selectedProfessional = profissionais.find((p) => p.id === selectedProfId);
  const selectedReportPatientName =
    reportPatients.find((p) => p.id === reportDialog.pacienteId)?.nome || "";

  return (
    <div className="space-y-6">
      {/* Selection Header */}
      <Card className="border-border shadow-sm">
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="space-y-1.5 flex-1 min-w-[240px]">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Profissional
            </Label>
            <Select value={selectedProfId} onValueChange={setSelectedProfId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione o profissional..." />
              </SelectTrigger>
              <SelectContent>
                {profissionais.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 w-full sm:w-auto flex-1 sm:flex-initial min-w-[150px]">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Início
            </Label>
            <Input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5 w-full sm:w-auto flex-1 sm:flex-initial min-w-[150px]">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Fim
            </Label>
            <Input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="h-10"
            />
          </div>
          {selectedProfId && agendamentos.length > 0 && (
            <Button
              onClick={() => setReportDialog({ ...reportDialog, open: true })}
              variant="outline"
              className="gap-2 h-10 ml-auto"
            >
              <FileText className="h-4 w-4" /> Relatório de Frequência
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {!selectedProfId ? (
        <Card className="border-dashed border-border/80 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 text-primary grid place-items-center mb-4 shadow-sm">
              <UserCheck className="h-7 w-7" />
            </div>
            <CardTitle className="text-lg font-bold">Frequência Digital MULTI</CardTitle>
            <CardDescription className="max-w-md mt-1.5">
              Selecione o seu perfil profissional acima para gerenciar as suas sessões e recolher
              assinaturas digitais dos responsáveis no celular ou tablet.
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Controle de Frequência</CardTitle>
                <CardDescription>
                  Profissional:{" "}
                  <span className="font-semibold text-foreground">
                    {selectedProfessional?.nome}
                  </span>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="px-2.5 py-1 text-xs">
                  {agendamentos.length} Sessões
                </Badge>
                <Badge
                  variant="outline"
                  className="px-2.5 py-1 text-xs text-green-600 border-green-200 bg-green-50/20"
                >
                  {agendamentos.filter((a: any) => a.assinatura_responsavel).length} Assinadas
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingAgs ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Carregando sessões...
              </div>
            ) : agendamentos.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Nenhum agendamento encontrado no período.
              </div>
            ) : (
              <>
                {/* Visualização Mobile (celular) */}
                <div className="md:hidden divide-y divide-border/60">
                  {agendamentos.map((a: any) => {
                    const signed = !!a.assinatura_responsavel;
                    return (
                      <div key={a.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-sm font-semibold text-foreground">
                              {format(new Date(a.data_inicio), "dd/MM/yyyy")}
                            </span>
                            <span className="text-[11px] text-muted-foreground block capitalize">
                              {format(new Date(a.data_inicio), "EEEE 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] font-bold uppercase",
                              a.status === "confirmado" &&
                                "border-green-500/30 text-green-600 bg-green-50/50",
                              a.status === "pago" &&
                                "border-emerald-500/30 text-emerald-600 bg-emerald-50/50",
                              a.status === "cancelado" &&
                                "border-red-500/30 text-red-600 bg-red-50/50",
                              a.status === "realizado" &&
                                "border-blue-500/30 text-blue-600 bg-blue-50/50",
                              a.status === "falta" &&
                                "border-orange-500/30 text-orange-600 bg-orange-50/50",
                              a.status === "pendente" &&
                                "border-yellow-500/30 text-yellow-600 bg-yellow-50/50",
                            )}
                          >
                            {STATUS_LABEL[a.status] || a.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">
                              Paciente
                            </span>
                            <span className="font-medium text-foreground">{a.pacientes?.nome}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">
                              Especialidade
                            </span>
                            <span className="font-medium text-foreground">
                              {a.servicos?.nome || "Sessão"}
                            </span>
                          </div>
                        </div>

                        <div className="pt-1">
                          {signed ? (
                            <Button
                              variant="outline"
                              type="button"
                              size="sm"
                              onClick={() => setViewSignDialog({ open: true, ag: a })}
                              className="w-full h-9 gap-1.5 border-green-200 hover:border-green-300 hover:bg-green-50 text-green-700 bg-green-50/20 text-xs px-2.5 cursor-pointer justify-center"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Assinado por{" "}
                              {a.nome_assinante?.split(" ")[0]}
                            </Button>
                          ) : a.status === "cancelado" ? (
                            <div className="text-center text-xs text-muted-foreground py-1.5 bg-muted/30 rounded">
                              Sessão cancelada
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleOpenSign(a)}
                              type="button"
                              size="sm"
                              className="w-full h-9 gap-1.5 text-xs px-2.5 cursor-pointer justify-center"
                            >
                              <Plus className="h-3.5 w-3.5" /> Assinar Digitalmente
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Visualização Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data & Hora</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Especialidade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Frequência / Assinatura</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agendamentos.map((a: any) => {
                        const signed = !!a.assinatura_responsavel;
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                              <div className="font-semibold text-foreground">
                                {format(new Date(a.data_inicio), "dd/MM/yyyy")}
                              </div>
                              <div className="text-[11px] text-muted-foreground capitalize">
                                {format(new Date(a.data_inicio), "EEEE 'às' HH:mm", { locale: ptBR })}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{a.pacientes?.nome}</TableCell>
                            <TableCell className="text-muted-foreground text-xs font-semibold">
                              {a.servicos?.nome || "Sessão"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] font-bold uppercase",
                                  a.status === "confirmado" &&
                                    "border-green-500/30 text-green-600 bg-green-50/50",
                                  a.status === "pago" &&
                                    "border-emerald-500/30 text-emerald-600 bg-emerald-50/50",
                                  a.status === "cancelado" &&
                                    "border-red-500/30 text-red-600 bg-red-50/50",
                                  a.status === "realizado" &&
                                    "border-blue-500/30 text-blue-600 bg-blue-50/50",
                                  a.status === "falta" &&
                                    "border-orange-500/30 text-orange-600 bg-orange-50/50",
                                  a.status === "pendente" &&
                                    "border-yellow-500/30 text-yellow-600 bg-yellow-50/50",
                                )}
                              >
                                {STATUS_LABEL[a.status] || a.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {signed ? (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    type="button"
                                    size="sm"
                                    onClick={() => setViewSignDialog({ open: true, ag: a })}
                                    className="h-8 gap-1 border-green-200 hover:border-green-300 hover:bg-green-50 text-green-700 bg-green-50/20 text-xs px-2.5 cursor-pointer"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Assinado por{" "}
                                    {a.nome_assinante?.split(" ")[0]}
                                  </Button>
                                </div>
                              ) : a.status === "cancelado" ? (
                                <span className="text-muted-foreground text-xs">—</span>
                              ) : (
                                <Button
                                  onClick={() => handleOpenSign(a)}
                                  type="button"
                                  size="sm"
                                  className="h-8 gap-1 text-xs px-2.5 cursor-pointer"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Assinar Digitalmente
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Signature Modal */}
      <Dialog
        open={signDialog.open}
        onOpenChange={(open) => setSignDialog({ open, ag: open ? signDialog.ag : null })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assinatura Digital de Frequência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-2">
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <div>
                  <span className="text-muted-foreground">Paciente:</span>{" "}
                  <span className="font-semibold text-foreground">
                    {signDialog.ag?.pacientes?.nome}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Profissional:</span>{" "}
                  <span className="font-semibold text-foreground">
                    {signDialog.ag?.profissionais?.nome}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Sessão:</span>{" "}
                  <span className="font-semibold text-foreground">
                    {signDialog.ag?.data_inicio &&
                      format(new Date(signDialog.ag.data_inicio), "dd/MM/yyyy 'às' HH:mm")}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resp-name">Nome do Responsável *</Label>
              <Input
                id="resp-name"
                placeholder="Ex: Maria Souza (Mãe)"
                value={nomeResponsavel}
                onChange={(e) => setNomeResponsavel(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Assinatura Digital *</Label>
              <SignaturePad
                onSave={handleSaveSignature}
                onCancel={() => setSignDialog({ open: false, ag: null })}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Signature Modal */}
      <Dialog
        open={viewSignDialog.open}
        onOpenChange={(open) => setViewSignDialog({ open, ag: open ? viewSignDialog.ag : null })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assinatura Digital Registrada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-2">
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <div>
                  <span className="text-muted-foreground">Paciente:</span>{" "}
                  <span className="font-semibold text-foreground">
                    {viewSignDialog.ag?.pacientes?.nome}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Assinante:</span>{" "}
                  <span className="font-semibold text-foreground">
                    {viewSignDialog.ag?.nome_assinante}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Data/Hora da Assinatura:</span>{" "}
                  <span className="font-semibold text-foreground">
                    {viewSignDialog.ag?.data_assinatura &&
                      format(new Date(viewSignDialog.ag.data_assinatura), "dd/MM/yyyy 'às' HH:mm")}
                  </span>
                </div>
              </div>
            </div>
            <div className="border border-border rounded-lg bg-white p-4 flex items-center justify-center">
              {viewSignDialog.ag?.assinatura_responsavel ? (
                <img
                  src={viewSignDialog.ag.assinatura_responsavel}
                  alt="Assinatura Digital"
                  className="max-h-36 object-contain"
                />
              ) : (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> Nenhuma imagem de assinatura salva.
                </div>
              )}
            </div>
            <DialogFooter className="justify-between sm:justify-between flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (confirm("Tem certeza que deseja excluir esta assinatura?")) {
                    clearSignatureMutation.mutate(viewSignDialog.ag.id);
                  }
                }}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
              >
                <Trash2 className="h-4 w-4" /> Excluir Assinatura
              </Button>
              <Button type="button" onClick={() => setViewSignDialog({ open: false, ag: null })}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attendance Report View Dialog */}
      <Dialog
        open={reportDialog.open}
        onOpenChange={(open) => setReportDialog({ ...reportDialog, open })}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="print:hidden">
            <DialogTitle>Gerar Relatório de Frequência</DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap items-end gap-3 pb-4 border-b border-border/60 print:hidden">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label>Paciente</Label>
              <Select
                value={reportDialog.pacienteId}
                onValueChange={(val) => setReportDialog({ ...reportDialog, pacienteId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente..." />
                </SelectTrigger>
                <SelectContent>
                  {reportPatients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[150px]">
              <Label>Mês de Referência</Label>
              <Input
                type="month"
                value={reportDialog.mesComp}
                onChange={(e) => setReportDialog({ ...reportDialog, mesComp: e.target.value })}
              />
            </div>
            <Button
              disabled={!reportDialog.pacienteId || reportData.length === 0}
              onClick={() => window.print()}
              type="button"
              className="gap-1.5 cursor-pointer"
            >
              <Printer className="h-4 w-4" /> Imprimir Relatório
            </Button>
          </div>

          {/* Printable Report Section */}
          <div
            id="freq-report-printable"
            className="p-4 bg-white text-black font-sans min-h-[400px]"
          >
            {!reportDialog.pacienteId ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground print:hidden">
                <FileText className="h-10 w-10 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-medium">
                  Selecione um paciente para carregar o relatório.
                </p>
              </div>
            ) : reportData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground print:hidden">
                <AlertCircle className="h-10 w-10 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-medium">
                  Nenhuma sessão encontrada para este paciente no mês selecionado.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-black pb-4">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">
                      Espaço MULTI
                    </h2>
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      Clínica Multidisciplinar de Desenvolvimento Infantil
                    </p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-md font-bold uppercase">Relatório de Frequência</h3>
                    <p className="text-xs font-semibold text-slate-800">
                      Mês:{" "}
                      <span className="capitalize font-bold">
                        {format(new Date(reportData[0].data_inicio), "MMMM yyyy", { locale: ptBR })}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-xs pb-4 border-b border-dashed border-gray-300">
                  <div>
                    <p>
                      <span className="font-bold">Paciente:</span> {selectedReportPatientName}
                    </p>
                    <p className="mt-1">
                      <span className="font-bold">Profissional:</span> {selectedProfessional?.nome}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>
                      <span className="font-bold">Especialidade:</span>{" "}
                      {selectedProfessional?.especialidade || "Terapia"}
                    </p>
                    <p className="mt-1">
                      <span className="font-bold">Total de Sessões:</span> {reportData.length}
                    </p>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full text-left border-collapse text-xs border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="p-2.5 font-bold border-r border-gray-300">Data</th>
                      <th className="p-2.5 font-bold border-r border-gray-300">Horário</th>
                      <th className="p-2.5 font-bold border-r border-gray-300">Serviço</th>
                      <th className="p-2.5 font-bold border-r border-gray-300">Status</th>
                      <th className="p-2.5 font-bold">Assinatura do Responsável</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((a: any) => (
                      <tr key={a.id} className="border-b border-gray-300">
                        <td className="p-2.5 border-r border-gray-300 font-semibold">
                          {format(new Date(a.data_inicio), "dd/MM/yyyy")}
                        </td>
                        <td className="p-2.5 border-r border-gray-300 capitalize">
                          {format(new Date(a.data_inicio), "EEEE 'às' HH:mm", { locale: ptBR })}
                        </td>
                        <td className="p-2.5 border-r border-gray-300">
                          {a.servicos?.nome || "Sessão"}
                        </td>
                        <td className="p-2.5 border-r border-gray-300">
                          {STATUS_LABEL[a.status] || a.status}
                        </td>
                        <td className="p-1.5 flex items-center justify-center">
                          {a.assinatura_responsavel ? (
                            <div className="flex flex-col items-center">
                              <img
                                src={a.assinatura_responsavel}
                                alt="Assinatura"
                                className="h-8 max-w-[120px] object-contain"
                              />
                              <span className="text-[9px] text-gray-500 font-medium mt-0.5">
                                Signed by: {a.nome_assinante}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-[10px]">
                              Pendente de assinatura
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer signatures */}
                <div className="grid grid-cols-2 gap-12 pt-16 text-center text-[10px]">
                  <div>
                    <div className="border-t border-black w-48 mx-auto mt-4"></div>
                    <p className="font-bold mt-1.5">{selectedProfessional?.nome}</p>
                    <p className="text-gray-500 font-medium">
                      {selectedProfessional?.especialidade || "Profissional"}
                    </p>
                  </div>
                  <div>
                    <div className="border-t border-black w-48 mx-auto mt-4"></div>
                    <p className="font-bold mt-1.5">Assinatura da Direção</p>
                    <p className="text-gray-500 font-medium">Clínica Espaço MULTI</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Global CSS for Print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #freq-report-printable, #freq-report-printable * {
            visibility: visible;
          }
          #freq-report-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
