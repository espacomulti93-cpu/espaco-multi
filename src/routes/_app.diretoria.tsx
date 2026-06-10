import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, differenceInDays, startOfDay } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Lock,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  ArrowRightLeft,
  Eye,
  EyeOff,
  Check,
  Pencil,
  Search,
  DollarSign,
  AlertCircle,
  Clock,
  MessageCircle,
  ExternalLink,
  ArrowLeft,
  ChevronLeft,
} from "lucide-react";

export const Route = createFileRoute("/_app/diretoria")({
  component: DiretoriaPage,
});

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    try {
      const expectedPassword = import.meta.env.VITE_DIRETORIA_PASSWORD || "Gabi2020@";
      if (password === expectedPassword) {
        onUnlock();
        toast.success("Acesso liberado!");
      } else {
        toast.error("Senha incorreta!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao validar senha.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-lg">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary mb-3">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Acesso Restrito</CardTitle>
          <CardDescription>
            Digite sua senha de administrador para visualizar as informações financeiras da diretoria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha do Administrador</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-center tracking-widest pr-10"
                  autoFocus
                  disabled={verifying}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={verifying}>
              {verifying ? "Verificando..." : "Confirmar Senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function DiretoriaPageContent() {
  const queryClient = useQueryClient();
  const today = new Date();
  const [inicio, setInicio] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [fim, setFim] = useState(format(endOfMonth(today), "yyyy-MM-dd"));

  // Form states for new expense
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [categoria, setCategoria] = useState("Outros");

  // Fetch Patients
  const { data: pacientes = [] } = useQuery({
    queryKey: ["dir-pacientes-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacientes")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const patientMap = useMemo(() => {
    return new Map((pacientes || []).map((p) => [p.id, p.nome]));
  }, [pacientes]);

  // Fetch all responsaveis to map their contacts
  const { data: responsaveis = [] } = useQuery({
    queryKey: ["dir-responsaveis-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responsaveis")
        .select("id, paciente_id, nome, telefone, whatsapp, parentesco");
      if (error) throw error;
      return data;
    },
  });

  const responsaveisMap = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const r of responsaveis || []) {
      const list = map.get(r.paciente_id) || [];
      list.push(r);
      map.set(r.paciente_id, list);
    }
    return map;
  }, [responsaveis]);

  // Fetch Invoices
  const { data: faturas = [], isLoading: loadingFaturas } = useQuery({
    queryKey: ["dir-faturas", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faturas")
        .select("id, valor, status, competencia, vencimento, pago_em, metodo, observacoes, paciente_id")
        .gte("competencia", inicio)
        .lte("competencia", fim);
      if (error) throw error;
      return data;
    },
  });

  // Confirm payment mutation
  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ id, pago_em, metodo, observacoes }: { id: string; pago_em: string; metodo: string; observacoes?: string }) => {
      const { error } = await supabase
        .from("faturas")
        .update({
          status: "paga",
          pago_em,
          metodo: metodo as any,
          observacoes: observacoes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dir-faturas"] });
      toast.success("Pagamento confirmado com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao confirmar pagamento: " + err.message);
    },
  });

  // Create billing (manual) mutation
  const createFaturaMutation = useMutation({
    mutationFn: async (newFatura: { paciente_id: string; competencia: string; vencimento?: string | null; valor: number; status: string; observacoes?: string | null }) => {
      const { error } = await supabase
        .from("faturas")
        .insert({
          paciente_id: newFatura.paciente_id,
          competencia: newFatura.competencia,
          vencimento: newFatura.vencimento || null,
          valor: newFatura.valor,
          status: newFatura.status as any,
          observacoes: newFatura.observacoes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dir-faturas"] });
      toast.success("Cobrança criada com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao criar cobrança: " + err.message);
    },
  });

  // Edit billing mutation
  const editFaturaMutation = useMutation({
    mutationFn: async (updatedFatura: { id: string; competencia: string; vencimento?: string | null; valor: number; status: string; pago_em?: string | null; metodo?: string | null; observacoes?: string | null }) => {
      const { error } = await supabase
        .from("faturas")
        .update({
          competencia: updatedFatura.competencia,
          vencimento: updatedFatura.vencimento || null,
          valor: updatedFatura.valor,
          status: updatedFatura.status as any,
          pago_em: updatedFatura.status === "paga" ? (updatedFatura.pago_em || new Date().toISOString()) : null,
          metodo: updatedFatura.status === "paga" ? (updatedFatura.metodo as any) : null,
          observacoes: updatedFatura.observacoes || null,
        })
        .eq("id", updatedFatura.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dir-faturas"] });
      toast.success("Cobrança atualizada com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar cobrança: " + err.message);
    },
  });

  // Delete billing mutation
  const deleteFaturaMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("fatura_itens").delete().eq("fatura_id", id);
      const { error } = await supabase.from("faturas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dir-faturas"] });
      toast.success("Cobrança excluída com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao excluir cobrança: " + err.message);
    },
  });

  // Fetch Expenses
  const { data: despesas = [], isLoading: loadingDespesas } = useQuery({
    queryKey: ["dir-despesas", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("despesas")
        .select("*")
        .gte("data", inicio)
        .lte("data", fim)
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Insert Expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (newExpense: {
      descricao: string;
      valor: number;
      data: string;
      categoria: string;
    }) => {
      const { data, error } = await supabase.from("despesas").insert(newExpense);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dir-despesas"] });
      toast.success("Despesa cadastrada com sucesso!");
      setDescricao("");
      setValor("");
      setData(format(new Date(), "yyyy-MM-dd"));
      setCategoria("Outros");
    },
    onError: (err: any) => {
      console.error(err);
      toast.error("Erro ao cadastrar despesa: " + err.message);
    },
  });

  // Delete Expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("despesas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dir-despesas"] });
      toast.success("Despesa excluída com sucesso!");
    },
    onError: (err: any) => {
      console.error(err);
      toast.error("Erro ao excluir despesa: " + err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) {
      toast.error("Digite uma descrição para a despesa.");
      return;
    }
    const parsedValor = parseFloat(valor.replace(",", "."));
    if (isNaN(parsedValor) || parsedValor <= 0) {
      toast.error("Digite um valor válido maior que zero.");
      return;
    }

    createExpenseMutation.mutate({
      descricao,
      valor: parsedValor,
      data,
      categoria,
    });
  };

  // Calculations
  const stats = useMemo(() => {
    // Faturamento Recebido (Pagas)
    const faturamentoRecebido = (faturas || [])
      .filter((f) => f.status === "paga")
      .reduce((acc, f) => acc + Number(f.valor), 0);

    // Faturamento A Receber (Abertas)
    const faturamentoAReceber = (faturas || [])
      .filter((f) => f.status === "aberta")
      .reduce((acc, f) => acc + Number(f.valor), 0);

    // Faturamento Vencido (Vencidas)
    const faturamentoVencido = (faturas || [])
      .filter((f) => f.status === "vencida")
      .reduce((acc, f) => acc + Number(f.valor), 0);

    // Faturamento Pendente (Abertas/Vencidas)
    const faturamentoPendente = faturamentoAReceber + faturamentoVencido;

    // Faturamento Geral (Total Faturas)
    const faturamentoTotal = (faturas || [])
      .filter((f) => f.status !== "cancelada")
      .reduce((acc, f) => acc + Number(f.valor), 0);

    // Despesas
    const totalDespesas = despesas.reduce((acc, d) => acc + Number(d.valor), 0);

    // Balanços
    const balancoReal = faturamentoRecebido - totalDespesas;
    const balancoEstimado = faturamentoTotal - totalDespesas;

    return {
      faturamentoRecebido,
      faturamentoAReceber,
      faturamentoVencido,
      faturamentoPendente,
      faturamentoTotal,
      totalDespesas,
      balancoReal,
      balancoEstimado,
    };
  }, [faturas, despesas]);

  function brl(n: number) {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  const isMutating = createExpenseMutation.isPending || deleteExpenseMutation.isPending;

  // Fetch active professionals
  const { data: profissionais = [] } = useQuery({
    queryKey: ["dir-profissionais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id, nome, especialidade, cor, valor_sessao, valores_config")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const professionalMap = useMemo(() => {
    return new Map((profissionais || []).map((p) => [p.id, p.nome]));
  }, [profissionais]);

  // Fetch all agendamentos for professional payment calculation
  const { data: agendamentosRepasses = [], isLoading: loadingAgendamentos } = useQuery({
    queryKey: ["dir-agendamentos-repasses", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select(`
          id,
          status,
          data_inicio,
          paciente_id,
          profissional_id,
          servico_id,
          observacoes,
          pacientes (
            id,
            nome,
            cids_secundarios
          ),
          profissionais (
            id,
            nome,
            especialidade,
            valor_sessao,
            valores_config
          ),
          servicos (
            id,
            nome
          ),
          fatura_itens (
            total,
            valor_unitario
          )
        `)
        .gte("data_inicio", `${inicio}T00:00:00`)
        .lte("data_inicio", `${fim}T23:59:59`);
      if (error) throw error;
      return data || [];
    },
  });

  // Helper to resolve specialty of an appointment
  const getAppointmentSpecialty = (a: any) => {
    if (a.servicos?.nome) return a.servicos.nome;
    const pacSpecs = (
      Array.isArray(a.pacientes?.cids_secundarios) ? a.pacientes.cids_secundarios : []
    ).filter((s: any): s is string => typeof s === "string");
    const profSpecs = a.profissionais?.especialidade
      ? a.profissionais.especialidade
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];
    const intersection = pacSpecs.filter((s: string) =>
      profSpecs.some((ps: string) => ps.toLowerCase() === s.toLowerCase()),
    );
    if (intersection.length > 0) return intersection[0];
    if (profSpecs.length > 0) return profSpecs[0];
    return "Geral";
  };

  // Helper to get session value
  const getAppointmentValue = (a: any) => {
    if (a.fatura_itens && a.fatura_itens.length > 0) {
      return Number(a.fatura_itens[0].total || 0);
    }
    
    // Fallback logic equivalent to fn_get_pricing
    const prof = a.profissionais;
    if (!prof) return 0;
    
    const spec = getAppointmentSpecialty(a);
    const isAnamnese = a.observacoes?.includes("[Tipo: Anamnese]");
    
    const config = prof.valores_config || { especialidades: [], descontos: [] };
    const valorDefault = Number(prof.valor_sessao || 0);
    
    // 1. Check custom patient discount
    if (Array.isArray(config.descontos) && config.descontos.length > 0) {
      const d = config.descontos.find(
        (item: any) =>
          item.paciente_id === a.paciente_id &&
          String(item.especialidade || "").toLowerCase() === String(spec || "").toLowerCase()
      );
      if (d) {
        return isAnamnese ? Number(d.valor_avaliacao || 0) : Number(d.valor_sessao || 0);
      }
    }
    
    // 2. Check standard specialty rates
    if (Array.isArray(config.especialidades) && config.especialidades.length > 0) {
      const e = config.especialidades.find(
        (item: any) => String(item.nome || "").toLowerCase() === String(spec || "").toLowerCase()
      );
      if (e) {
        if (isAnamnese) {
          return Number(e.valor_avaliacao || 0);
        } else {
          if (String(spec).toLowerCase() === "ap") return 0;
          return Number(e.valor_sessao ?? valorDefault ?? 0);
        }
      }
    }
    
    // 3. Default professional rate
    if (isAnamnese) {
      return 0;
    } else {
      return valorDefault;
    }
  };

  const getRepasseRates = (specialty: string) => {
    const isAtAba = String(specialty || "").trim().toUpperCase() === "AT ABA";
    if (isAtAba) {
      return { profPct: 0.5, clinicPct: 0.5, label: "50% / 50%" };
    }
    return { profPct: 0.7, clinicPct: 0.3, label: "70% / 30%" };
  };

  // State variables for payment calculation tab
  const [selectedProfId, setSelectedProfId] = useState<string>("all");
  const [sessionStatusFilter, setSessionStatusFilter] = useState<string>("confirmado_pago");
  const [viewingProfDetail, setViewingProfDetail] = useState<string | null>(null);

  const handleSelectProf = (val: string) => {
    setSelectedProfId(val);
    if (val === "all") {
      setViewingProfDetail(null);
    } else {
      setViewingProfDetail(val);
    }
  };

  const filteredRepasses = useMemo(() => {
    return agendamentosRepasses.filter((a: any) => {
      if (a.status === "cancelado") return false;

      const matchesProf = selectedProfId === "all" || a.profissional_id === selectedProfId;
      
      let matchesStatus = true;
      if (sessionStatusFilter === "confirmado_pago") {
        matchesStatus = a.status === "confirmado" || a.status === "pago";
      } else if (sessionStatusFilter === "confirmado") {
        matchesStatus = a.status === "confirmado";
      } else if (sessionStatusFilter === "pago") {
        matchesStatus = a.status === "pago";
      } else if (sessionStatusFilter === "realizado") {
        matchesStatus = a.status === "realizado";
      }

      return matchesProf && matchesStatus;
    });
  }, [agendamentosRepasses, selectedProfId, sessionStatusFilter]);

  const repasseStats = useMemo(() => {
    let totalSessões = 0;
    let faturamentoBruto = 0;
    let repasseProfissional = 0;
    let comissaoClinica = 0;

    filteredRepasses.forEach((a: any) => {
      const val = getAppointmentValue(a);
      const spec = getAppointmentSpecialty(a);
      const { profPct, clinicPct } = getRepasseRates(spec);

      totalSessões += 1;
      faturamentoBruto += val;
      repasseProfissional += val * profPct;
      comissaoClinica += val * clinicPct;
    });

    return {
      totalSessões,
      faturamentoBruto,
      repasseProfissional,
      comissaoClinica,
    };
  }, [filteredRepasses]);

  const consolidatedRepasses = useMemo(() => {
    const groups = new Map<string, {
      profissionalId: string;
      nome: string;
      cor: string;
      especialidades: Set<string>;
      totalSessões: number;
      faturamentoBruto: number;
      repasseProfissional: number;
      comissaoClinica: number;
      sessoes: any[];
    }>();

    filteredRepasses.forEach((a: any) => {
      const profId = a.profissional_id;
      if (!profId) return;

      const profName = a.profissionais?.nome || "Desconhecido";
      const profCor = a.profissionais?.cor || "#000000";
      const spec = getAppointmentSpecialty(a);
      const val = getAppointmentValue(a);
      const { profPct, clinicPct } = getRepasseRates(spec);

      let group = groups.get(profId);
      if (!group) {
        group = {
          profissionalId: profId,
          nome: profName,
          cor: profCor,
          especialidades: new Set<string>(),
          totalSessões: 0,
          faturamentoBruto: 0,
          repasseProfissional: 0,
          comissaoClinica: 0,
          sessoes: [],
        };
        groups.set(profId, group);
      }

      group.especialidades.add(spec);
      group.totalSessões += 1;
      group.faturamentoBruto += val;
      group.repasseProfissional += val * profPct;
      group.comissaoClinica += val * clinicPct;
      group.sessoes.push(a);
    });

    return Array.from(groups.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [filteredRepasses]);


  // Billing Filters
  const [searchPatient, setSearchPatient] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subTab, setSubTab] = useState<"consolidado" | "historico">("consolidado");

  // Patient Faturas Modal state
  const [patientFaturasDialog, setPatientFaturasDialog] = useState<{ open: boolean; pacienteId: string; pacienteNome: string }>({ open: false, pacienteId: "", pacienteNome: "" });

  const handleOpenPatientFaturas = (pacienteId: string, pacienteNome: string) => {
    setPatientFaturasDialog({ open: true, pacienteId, pacienteNome });
  };

  // Memoized consolidated billing by patient
  const consolidatedPatients = useMemo(() => {
    const map = new Map<string, {
      pacienteId: string;
      nome: string;
      faturasPendentesCount: number;
      totalPendente: number;
      totalPago: number;
      totalGeral: number;
      temAtraso: boolean;
      faturas: any[];
    }>();

    for (const f of faturas || []) {
      const pId = f.paciente_id;
      if (!pId) continue;
      const patientName = patientMap.get(pId) || "Paciente Desconhecido";
      
      let entry = map.get(pId);
      if (!entry) {
        entry = {
          pacienteId: pId,
          nome: patientName,
          faturasPendentesCount: 0,
          totalPendente: 0,
          totalPago: 0,
          totalGeral: 0,
          temAtraso: false,
          faturas: [],
        };
        map.set(pId, entry);
      }

      entry.faturas.push(f);
      const val = Number(f.valor) || 0;
      
      if (f.status === "paga") {
        entry.totalPago += val;
      } else if (f.status === "aberta" || f.status === "vencida") {
        entry.totalPendente += val;
        entry.faturasPendentesCount += 1;
        
        // Calculate delay days
        if (f.vencimento) {
          const today = startOfDay(new Date());
          const dueDate = startOfDay(new Date(f.vencimento + "T12:00:00"));
          const diff = differenceInDays(today, dueDate);
          if (diff > 0 || f.status === "vencida") {
            entry.temAtraso = true;
          }
        }
      }
      
      if (f.status !== "cancelada") {
        entry.totalGeral += val;
      }
    }

    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [faturas, patientMap]);

  const filteredConsolidated = useMemo(() => {
    return consolidatedPatients.filter((c) => {
      const matchesSearch = c.nome.toLowerCase().includes(searchPatient.toLowerCase());
      if (statusFilter === "aberta" && c.totalPendente === 0) return false;
      if (statusFilter === "paga" && c.totalPago === 0) return false;
      if (statusFilter === "vencida" && !c.temAtraso) return false;
      return matchesSearch;
    });
  }, [consolidatedPatients, searchPatient, statusFilter]);

  const patientFaturas = useMemo(() => {
    if (!patientFaturasDialog.pacienteId) return [];
    return (faturas || [])
      .filter((f) => f.paciente_id === patientFaturasDialog.pacienteId)
      .sort((a, b) => new Date(b.competencia).getTime() - new Date(a.competencia).getTime());
  }, [faturas, patientFaturasDialog.pacienteId]);

  const handleWhatsAppClick = (pacienteId: string, totalPendente: number, patientName: string) => {
    const resps = responsaveisMap.get(pacienteId) || [];
    const primaryResp = resps.find(r => r.whatsapp) || resps.find(r => r.telefone) || resps[0];
    if (!primaryResp) {
      toast.error("Nenhum responsável com telefone cadastrado para este paciente.");
      return;
    }
    const num = primaryResp.whatsapp || primaryResp.telefone;
    if (!num) {
      toast.error("Responsável sem telefone ou WhatsApp cadastrado.");
      return;
    }
    const cleanNum = String(num).replace(/\D/g, "");
    if (!cleanNum) {
      toast.error("Número de telefone inválido.");
      return;
    }
    let phoneWithCountry = cleanNum;
    if (cleanNum.length === 10 || cleanNum.length === 11) {
      phoneWithCountry = "55" + cleanNum;
    }

    const textMsg = `Olá, ${primaryResp.nome}!
Gostaríamos de lembrar que constam pendências financeiras em aberto referentes aos atendimentos de *${patientName}* no valor total de *${brl(totalPendente)}*.

Poderia, por gentileza, realizar a confirmação do pagamento?
Caso já tenha pago, por favor nos envie o comprovante.

Agradecemos a atenção!
*Espaço Multi*`;

    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(textMsg)}`;
    window.open(url, "_blank");
  };

  // Billing Modals
  const [payDialog, setPayDialog] = useState<{ open: boolean; fatura: any }>({ open: false, fatura: null });
  const [editDialog, setEditDialog] = useState<{ open: boolean; fatura: any }>({ open: false, fatura: null });
  const [createDialog, setCreateDialog] = useState(false);

  // Form states
  const [payForm, setPayForm] = useState({
    pago_em: format(new Date(), "yyyy-MM-dd"),
    metodo: "pix",
    observacoes: "",
  });

  const [faturaForm, setFaturaForm] = useState({
    paciente_id: "",
    competencia: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    vencimento: "",
    valor: "",
    status: "aberta",
    observacoes: "",
  });

  const handleOpenConfirmPayment = (fatura: any) => {
    setPayForm({
      pago_em: format(new Date(), "yyyy-MM-dd"),
      metodo: fatura.metodo || "pix",
      observacoes: fatura.observacoes || "",
    });
    setPayDialog({ open: true, fatura });
  };

  const handleOpenEdit = (fatura: any) => {
    setFaturaForm({
      paciente_id: fatura.paciente_id,
      competencia: fatura.competencia,
      vencimento: fatura.vencimento || "",
      valor: String(fatura.valor),
      status: fatura.status,
      observacoes: fatura.observacoes || "",
    });
    setEditDialog({ open: true, fatura });
  };

  const getDaysDelayed = (fatura: any) => {
    if (fatura.status === "paga") {
      if (fatura.pago_em && fatura.vencimento) {
        const payDate = startOfDay(new Date(fatura.pago_em));
        const dueDate = startOfDay(new Date(fatura.vencimento + "T12:00:00"));
        const diff = differenceInDays(payDate, dueDate);
        return diff > 0 ? diff : 0;
      }
      return 0;
    }
    if (fatura.status === "cancelada") return 0;
    if (fatura.vencimento) {
      const today = startOfDay(new Date());
      const dueDate = startOfDay(new Date(fatura.vencimento + "T12:00:00"));
      const diff = differenceInDays(today, dueDate);
      return diff > 0 ? diff : 0;
    }
    return 0;
  };

  const filteredFaturas = useMemo(() => {
    return (faturas || []).filter((f) => {
      const patientName = patientMap.get(f.paciente_id) || "";
      const matchesSearch = patientName.toLowerCase().includes(searchPatient.toLowerCase());
      const matchesStatus = statusFilter === "all" || f.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [faturas, searchPatient, statusFilter, patientMap]);

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <Card className="border-border shadow-sm">
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <Label className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <Calendar className="h-3.5 w-3.5" /> Data Início
            </Label>
            <Input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <Label className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <Calendar className="h-3.5 w-3.5" /> Data Fim
            </Label>
            <Input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="h-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Financial Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-emerald-500/10 shadow-sm relative overflow-hidden group hover:shadow-md transition duration-200">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Receita Recebida
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {brl(stats.faturamentoRecebido)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Total Faturado:{" "}
                <span className="font-medium">{brl(stats.faturamentoTotal)}</span>{" "}
                (Pendente: {brl(stats.faturamentoPendente)})
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-500/10 shadow-sm relative overflow-hidden group hover:shadow-md transition duration-200">
          <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Despesas Totais
              </div>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {brl(stats.totalDespesas)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Comprometimento de receita no período selecionado
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`shadow-sm relative overflow-hidden group hover:shadow-md transition duration-200 ${
            stats.balancoReal >= 0 ? "border-emerald-500/10" : "border-rose-500/10"
          }`}
        >
          <div
            className={`absolute top-0 left-0 w-full h-1 ${
              stats.balancoReal >= 0 ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
          <CardContent className="flex items-center gap-4 p-5">
            <div
              className={`grid h-12 w-12 place-items-center rounded-xl ${
                stats.balancoReal >= 0
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400"
              }`}
            >
              <ArrowRightLeft className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Balanço Líquido
              </div>
              <div
                className={`text-2xl font-bold ${
                  stats.balancoReal >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {brl(stats.balancoReal)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Balanço Estimado (Total Faturado):{" "}
                <span className="font-semibold">{brl(stats.balancoEstimado)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full space-y-6">
        <TabsList className="bg-muted p-1 rounded-xl inline-flex">
          <TabsTrigger value="overview" className="rounded-lg px-4 py-2 text-sm font-medium">
            Despesas & Resumo
          </TabsTrigger>
          <TabsTrigger value="cobrancas" className="rounded-lg px-4 py-2 text-sm font-medium">
            Cobranças por Paciente
          </TabsTrigger>
          <TabsTrigger value="pagamentos" className="rounded-lg px-4 py-2 text-sm font-medium">
            Repasses de Profissionais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-0">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-1">
              {/* Register Expense Form Card */}
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Cadastrar Despesa</CardTitle>
                  <CardDescription>
                    Registre os custos e gastos operacionais da clínica.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="expense-desc">Descrição</Label>
                      <Input
                        id="expense-desc"
                        placeholder="Ex: Aluguel da clínica"
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="expense-value">Valor (R$)</Label>
                        <Input
                          id="expense-value"
                          placeholder="0.00"
                          value={valor}
                          onChange={(e) => setValor(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="expense-date">Data</Label>
                        <Input
                          id="expense-date"
                          type="date"
                          value={data}
                          onChange={(e) => setData(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="expense-category">Categoria</Label>
                      <Select value={categoria} onValueChange={setCategoria}>
                        <SelectTrigger id="expense-category" className="w-full">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Aluguel">Aluguel / Condomínio</SelectItem>
                          <SelectItem value="Salários">Salários / Honorários</SelectItem>
                          <SelectItem value="Impostos">Impostos / Taxas</SelectItem>
                          <SelectItem value="Materiais">Materiais Clínicos/Escritório</SelectItem>
                          <SelectItem value="Limpeza">Limpeza / Conservação</SelectItem>
                          <SelectItem value="Utilidades">Água / Luz / Internet</SelectItem>
                          <SelectItem value="Marketing">Marketing / Divulgação</SelectItem>
                          <SelectItem value="Outros">Outros Gastos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="submit"
                      disabled={isMutating}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" /> Cadastrar Despesa
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Financeiro do Período Card */}
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Financeiro do período</CardTitle>
                  <CardDescription>
                    Detalhamento de faturas por status no período selecionado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between border-b py-2 last:border-0">
                    <span className="text-muted-foreground font-medium">Recebido</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {brl(stats.faturamentoRecebido)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b py-2 last:border-0">
                    <span className="text-muted-foreground font-medium">A receber</span>
                    <span className="font-semibold">
                      {brl(stats.faturamentoAReceber)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b py-2 last:border-0">
                    <span className="text-muted-foreground font-medium">Vencido</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {brl(stats.faturamentoVencido)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Expenses List Table Card */}
            <Card className="border-border shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Despesas Registradas</CardTitle>
                <CardDescription>
                  Lista de gastos efetuados no período selecionado.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                {loadingDespesas ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Carregando despesas...
                  </div>
                ) : despesas.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Nenhuma despesa cadastrada neste período.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {despesas.map((d: any) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-medium">
                              {format(new Date(d.data + "T12:00:00"), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate" title={d.descricao}>
                              {d.descricao}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                {d.categoria || "Outros"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-rose-600 dark:text-rose-400">
                              {brl(Number(d.valor))}
                            </TableCell>
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Tem certeza que deseja excluir esta despesa?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação é irreversível. A despesa "{d.descricao}" no valor
                                      de {brl(Number(d.valor))} será excluída permanentemente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteExpenseMutation.mutate(d.id)}
                                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cobrancas" className="mt-0">
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg">Central de Cobrança</CardTitle>
                <CardDescription>
                  Acompanhamento consolidado de valores, contato com responsáveis e confirmação de pagamentos.
                </CardDescription>
              </div>
              <Button onClick={() => {
                setFaturaForm({
                  paciente_id: "",
                  competencia: format(startOfMonth(new Date()), "yyyy-MM-dd"),
                  vencimento: "",
                  valor: "",
                  status: "aberta",
                  observacoes: "",
                });
                setCreateDialog(true);
              }} className="gap-1.5 self-start sm:self-center">
                <Plus className="h-4 w-4" /> Nova Cobrança
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sub-tabs Switcher */}
              <div className="flex border-b border-border pb-px mb-2">
                <button
                  onClick={() => setSubTab("consolidado")}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
                    subTab === "consolidado"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Resumo por Paciente
                </button>
                <button
                  onClick={() => setSubTab("historico")}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
                    subTab === "historico"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Histórico de Faturas
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Buscar paciente..."
                    value={searchPatient}
                    onChange={(e) => setSearchPatient(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                <div className="w-[180px]">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="aberta">Em Aberto</SelectItem>
                      <SelectItem value="paga">Pagas</SelectItem>
                      <SelectItem value="vencida">Vencidas</SelectItem>
                      <SelectItem value="cancelada">Canceladas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {subTab === "consolidado" ? (
                loadingFaturas ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Carregando cobranças consolidadas...
                  </div>
                ) : filteredConsolidated.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                    Nenhuma cobrança consolidada encontrada para os filtros selecionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader className="bg-muted/40 font-semibold text-foreground">
                        <TableRow>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Responsável Financeiro</TableHead>
                          <TableHead className="text-center">Faturas Pendentes</TableHead>
                          <TableHead>Soma Pendente</TableHead>
                          <TableHead>Soma Paga</TableHead>
                          <TableHead>Soma Geral</TableHead>
                          <TableHead>Situação</TableHead>
                          <TableHead className="w-[180px] text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredConsolidated.map((c) => {
                          const resps = responsaveisMap.get(c.pacienteId) || [];
                          const primaryResp = resps.find(r => r.whatsapp) || resps.find(r => r.telefone) || resps[0];
                          
                          return (
                            <TableRow key={c.pacienteId} className="hover:bg-muted/30">
                              <TableCell className="font-semibold text-foreground">
                                {c.nome}
                              </TableCell>
                              <TableCell>
                                {primaryResp ? (
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm">
                                      <span className="font-semibold text-foreground block leading-tight">{primaryResp.nome}</span>
                                      {primaryResp.parentesco && (
                                        <span className="text-muted-foreground text-[11px]">
                                          {primaryResp.parentesco}
                                        </span>
                                      )}
                                    </div>
                                    {(primaryResp.whatsapp || primaryResp.telefone) && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/40 flex items-center gap-1"
                                        onClick={() => handleWhatsAppClick(c.pacienteId, c.totalPendente, c.nome)}
                                        title={`Chamar no WhatsApp: ${primaryResp.whatsapp || primaryResp.telefone}`}
                                      >
                                        <MessageCircle className="h-3.5 w-3.5 fill-emerald-600/10 shrink-0" />
                                        WhatsApp
                                      </Button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">
                                    Nenhum responsável
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {c.faturasPendentesCount}
                              </TableCell>
                              <TableCell className={`font-semibold ${c.totalPendente > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
                                {brl(c.totalPendente)}
                              </TableCell>
                              <TableCell className={`font-medium ${c.totalPago > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                                {brl(c.totalPago)}
                              </TableCell>
                              <TableCell className="font-medium text-foreground">
                                {brl(c.totalGeral)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    c.temAtraso
                                      ? "destructive"
                                      : c.totalPendente > 0
                                      ? "outline"
                                      : c.totalPago > 0
                                      ? "default"
                                      : "secondary"
                                  }
                                  className={
                                    c.temAtraso
                                      ? "bg-rose-500 hover:bg-rose-600 text-white border-transparent"
                                      : c.totalPendente > 0
                                      ? "bg-sky-500 hover:bg-sky-600 text-white border-transparent"
                                      : c.totalPago > 0
                                      ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
                                      : ""
                                  }
                                >
                                  {c.temAtraso
                                    ? "Atrasado"
                                    : c.totalPendente > 0
                                    ? "No Prazo"
                                    : c.totalPago > 0
                                    ? "Em Dia"
                                    : "Sem Faturas"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1 font-medium"
                                    onClick={() => handleOpenPatientFaturas(c.pacienteId, c.nome)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Ver Faturas
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Nova Cobrança para este Paciente"
                                    className="h-8 w-8 text-primary hover:bg-primary/5"
                                    onClick={() => {
                                      setFaturaForm({
                                        paciente_id: c.pacienteId,
                                        competencia: format(startOfMonth(new Date()), "yyyy-MM-dd"),
                                        vencimento: "",
                                        valor: "",
                                        status: "aberta",
                                        observacoes: "",
                                      });
                                      setCreateDialog(true);
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )
              ) : (
                /* Histórico de Faturas */
                loadingFaturas ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Carregando cobranças...
                  </div>
                ) : filteredFaturas.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                    Nenhuma cobrança encontrada para os filtros selecionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader className="bg-muted/40 font-semibold text-foreground">
                        <TableRow>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Competência</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Pagamento</TableHead>
                          <TableHead>Dias de Atraso</TableHead>
                          <TableHead className="w-[140px] text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFaturas.map((f: any) => {
                          const daysDelayed = getDaysDelayed(f);
                          const patientName = patientMap.get(f.paciente_id) || "—";
                          
                          return (
                            <TableRow key={f.id}>
                              <TableCell className="font-semibold text-foreground">
                                {patientName}
                              </TableCell>
                              <TableCell>
                                {f.competencia ? format(new Date(f.competencia + "T12:00:00"), "MM/yyyy") : "—"}
                              </TableCell>
                              <TableCell>
                                {f.vencimento ? format(new Date(f.vencimento + "T12:00:00"), "dd/MM/yyyy") : "—"}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {brl(Number(f.valor))}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    f.status === "paga"
                                      ? "default"
                                      : f.status === "vencida" || (f.status === "aberta" && daysDelayed > 0)
                                      ? "destructive"
                                      : f.status === "cancelada"
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className={
                                    f.status === "paga"
                                      ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
                                      : f.status === "aberta" && daysDelayed > 0
                                      ? "bg-rose-500 hover:bg-rose-600 text-white border-transparent"
                                      : f.status === "aberta"
                                      ? "bg-sky-500 hover:bg-sky-600 text-white border-transparent"
                                      : ""
                                  }
                                >
                                  {f.status === "aberta" && daysDelayed > 0
                                    ? "Vencida (Atrasada)"
                                    : f.status === "aberta"
                                    ? "Em Aberto"
                                    : f.status === "paga"
                                    ? "Pago"
                                    : f.status === "vencida"
                                    ? "Vencida"
                                    : "Cancelada"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {f.status === "paga" ? (
                                  <div className="space-y-0.5">
                                    <div>{f.pago_em ? format(new Date(f.pago_em), "dd/MM/yyyy") : "—"}</div>
                                    <div className="font-semibold uppercase tracking-wider text-[10px] text-emerald-600 dark:text-emerald-400">
                                      {f.metodo || ""}
                                    </div>
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell>
                                {f.status === "paga" ? (
                                  daysDelayed > 0 ? (
                                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                      Pago com {daysDelayed}d de atraso
                                    </span>
                                  ) : (
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                      <Check className="h-3 w-3" /> Pago em dia
                                    </span>
                                  )
                                ) : f.status === "cancelada" ? (
                                  "—"
                                ) : f.vencimento ? (
                                  daysDelayed > 0 ? (
                                    <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {daysDelayed} dias de atraso
                                    </span>
                                  ) : (
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                      <Clock className="h-3 w-3" /> No prazo
                                    </span>
                                  )
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">Sem vencimento</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  {f.status !== "paga" && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Confirmar Pagamento"
                                      className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                      onClick={() => handleOpenConfirmPayment(f)}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Editar Cobrança"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => handleOpenEdit(f)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Excluir Cobrança"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir Cobrança</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja excluir esta cobrança? Todos os itens de faturamento associados a agendamentos serão mantidos, mas a cobrança em si será excluída.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                          onClick={() => deleteFaturaMutation.mutate(f.id)}
                                        >
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagamentos" className="space-y-6 mt-0">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border shadow-sm relative overflow-hidden group hover:shadow-md transition duration-200">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
              <CardContent className="flex items-center gap-4 p-5">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/5 text-primary">
                  <Calendar className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total de Sessões
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {repasseStats.totalSessões}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    No período selecionado
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm relative overflow-hidden group hover:shadow-md transition duration-200">
              <div className="absolute top-0 left-0 w-full h-1 bg-sky-500" />
              <CardContent className="flex items-center gap-4 p-5">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/20 dark:text-sky-400">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Faturamento Bruto
                  </div>
                  <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                    {brl(repasseStats.faturamentoBruto)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Total bruto das sessões
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/10 shadow-sm relative overflow-hidden group hover:shadow-md transition duration-200">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
              <CardContent className="flex items-center gap-4 p-5">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Repasse Profissional
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {brl(repasseStats.repasseProfissional)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Valor total a repassar (70% ou 50%)
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-500/10 shadow-sm relative overflow-hidden group hover:shadow-md transition duration-200">
              <div className="absolute top-0 left-0 w-full h-1 bg-purple-500" />
              <CardContent className="flex items-center gap-4 p-5">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400">
                  <TrendingDown className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Comissão Clínica
                  </div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {brl(repasseStats.comissaoClinica)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Participação da clínica (30% ou 50%)
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters Card */}
          <Card className="border-border shadow-sm">
            <CardContent className="flex flex-wrap items-end gap-4 p-4">
              <div className="space-y-1.5 flex-1 min-w-[200px] max-w-xs">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profissional</Label>
                <Select value={selectedProfId} onValueChange={handleSelectProf}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Todos os Profissionais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Profissionais</SelectItem>
                    {(profissionais || []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex-1 min-w-[200px] max-w-xs">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status da Sessão</Label>
                <Select value={sessionStatusFilter} onValueChange={setSessionStatusFilter}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmado_pago">Confirmados & Pagos</SelectItem>
                    <SelectItem value="confirmado">Confirmados</SelectItem>
                    <SelectItem value="pago">Pagos</SelectItem>
                    <SelectItem value="realizado">Realizados</SelectItem>
                    <SelectItem value="todos">Todos os Status (exceto cancelados)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 flex justify-end self-center md:self-end">
                <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-500/10 rounded-lg px-3 py-2 flex items-center gap-1.5 max-w-md">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    Somente sessões nos status <strong>Confirmado</strong> ou <strong>Pago</strong> geram faturamento no sistema financeiro por padrão.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Calculation Content */}
          {loadingAgendamentos ? (
            <Card className="border-border shadow-sm p-8 text-center text-sm text-muted-foreground">
              Carregando dados de agendamentos e faturamento...
            </Card>
          ) : viewingProfDetail ? (
            /* DETAILED VIEW FOR A SPECIFIC PROFESSIONAL */
            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectProf("all")}
                      className="h-8 gap-1 font-semibold text-xs"
                    >
                      <ChevronLeft className="h-4 w-4" /> Voltar
                    </Button>
                    <CardTitle className="text-lg">
                      Detalhes do Profissional: {profissionais.find((p: any) => p.id === viewingProfDetail)?.nome || "—"}
                    </CardTitle>
                  </div>
                  <CardDescription className="mt-1 pl-12 sm:pl-16">
                    Lista detalhada de sessões e cálculo de repasse individualizado no período.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                {filteredRepasses.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Nenhuma sessão encontrada para este profissional nos critérios selecionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader className="bg-muted/40 font-semibold text-foreground">
                        <TableRow>
                          <TableHead>Data / Hora</TableHead>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Especialidade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Valor Sessão</TableHead>
                          <TableHead>Regra (Prof / Clínica)</TableHead>
                          <TableHead>Repasse Profissional</TableHead>
                          <TableHead>Comissão Clínica</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRepasses
                          .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime())
                          .map((a: any) => {
                            const val = getAppointmentValue(a);
                            const spec = getAppointmentSpecialty(a);
                            const { profPct, clinicPct, label: splitLabel } = getRepasseRates(spec);
                            
                            const repasseVal = val * profPct;
                            const clinicVal = val * clinicPct;

                            return (
                              <TableRow key={a.id} className="hover:bg-muted/30">
                                <TableCell className="font-medium">
                                  {format(new Date(a.data_inicio), "dd/MM/yyyy HH:mm")}
                                </TableCell>
                                <TableCell className="font-semibold text-foreground">
                                  {a.pacientes?.nome || "Paciente Desconhecido"}
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                    {spec}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="secondary"
                                    className={
                                      a.status === "pago"
                                        ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
                                        : a.status === "confirmado"
                                        ? "bg-sky-500 hover:bg-sky-600 text-white border-transparent"
                                        : ""
                                    }
                                  >
                                    {a.status === "pago"
                                      ? "Pago"
                                      : a.status === "confirmado"
                                      ? "Confirmado"
                                      : a.status === "realizado"
                                      ? "Realizado"
                                      : a.status === "falta"
                                      ? "Falta"
                                      : a.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-semibold text-foreground">
                                  {brl(val)}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {splitLabel}
                                </TableCell>
                                <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  {brl(repasseVal)}
                                </TableCell>
                                <TableCell className="font-medium text-purple-600 dark:text-purple-400">
                                  {brl(clinicVal)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* CONSOLIDATED VIEW OF ALL PROFESSIONALS */
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Resumo por Profissional</CardTitle>
                <CardDescription>
                  Valores totais a repassar e comissões consolidadas por profissional no período selecionado.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                {consolidatedRepasses.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                    Nenhum profissional com sessões correspondentes no período.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader className="bg-muted/40 font-semibold text-foreground">
                        <TableRow>
                          <TableHead>Profissional</TableHead>
                          <TableHead>Especialidades Atendidas</TableHead>
                          <TableHead className="text-center">Qtd de Sessões</TableHead>
                          <TableHead>Faturamento Bruto</TableHead>
                          <TableHead>Repasse Profissional</TableHead>
                          <TableHead>Comissão Clínica</TableHead>
                          <TableHead className="w-[120px] text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {consolidatedRepasses.map((group) => {
                          const specsArr = Array.from(group.especialidades);
                          
                          return (
                            <TableRow key={group.profissionalId} className="hover:bg-muted/30">
                              <TableCell className="font-semibold text-foreground">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: group.cor }}
                                  />
                                  <span>{group.nome}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {specsArr.map((spec) => (
                                    <span
                                      key={spec}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
                                    >
                                      {spec}
                                    </span>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {group.totalSessões}
                              </TableCell>
                              <TableCell className="font-semibold text-foreground">
                                {brl(group.faturamentoBruto)}
                              </TableCell>
                              <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {brl(group.repasseProfissional)}
                              </TableCell>
                              <TableCell className="font-semibold text-purple-600 dark:text-purple-400">
                                {brl(group.comissaoClinica)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 font-semibold text-xs"
                                  onClick={() => handleSelectProf(group.profissionalId)}
                                >
                                  <Eye className="h-3.5 w-3.5" /> Detalhar
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmar Pagamento Dialog */}
      <Dialog open={payDialog.open} onOpenChange={(open) => setPayDialog({ open, fatura: open ? payDialog.fatura : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (payDialog.fatura) {
                confirmPaymentMutation.mutate({
                  id: payDialog.fatura.id,
                  pago_em: new Date(payForm.pago_em + "T12:00:00").toISOString(),
                  metodo: payForm.metodo,
                  observacoes: payForm.observacoes,
                }, {
                  onSuccess: () => setPayDialog({ open: false, fatura: null })
                });
              }
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label>Paciente</Label>
              <Input value={payDialog.fatura ? (patientMap.get(payDialog.fatura.paciente_id) || "—") : ""} disabled className="bg-muted" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Valor</Label>
                <Input value={payDialog.fatura ? brl(Number(payDialog.fatura.valor)) : ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Label>Data de Pagamento</Label>
                <Input
                  type="date"
                  required
                  value={payForm.pago_em}
                  onChange={(e) => setPayForm({ ...payForm, pago_em: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Método de Pagamento</Label>
              <Select value={payForm.metodo} onValueChange={(val) => setPayForm({ ...payForm, metodo: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="convenio">Convênio</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                placeholder="Alguma observação sobre o pagamento..."
                rows={2}
                value={payForm.observacoes}
                onChange={(e) => setPayForm({ ...payForm, observacoes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayDialog({ open: false, fatura: null })}>
                Cancelar
              </Button>
              <Button type="submit" disabled={confirmPaymentMutation.isPending}>
                {confirmPaymentMutation.isPending ? "Confirmando..." : "Confirmar Pagamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Editar Cobrança Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, fatura: open ? editDialog.fatura : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cobrança</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editDialog.fatura) {
                editFaturaMutation.mutate({
                  id: editDialog.fatura.id,
                  competencia: faturaForm.competencia,
                  vencimento: faturaForm.vencimento ? faturaForm.vencimento : null,
                  valor: parseFloat(faturaForm.valor.replace(",", ".")),
                  status: faturaForm.status,
                  observacoes: faturaForm.observacoes,
                }, {
                  onSuccess: () => setEditDialog({ open: false, fatura: null })
                });
              }
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label>Paciente</Label>
              <Input value={editDialog.fatura ? (patientMap.get(editDialog.fatura.paciente_id) || "—") : ""} disabled className="bg-muted" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Mês de Competência</Label>
                <Input
                  type="date"
                  required
                  value={faturaForm.competencia}
                  onChange={(e) => setFaturaForm({ ...faturaForm, competencia: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={faturaForm.vencimento}
                  onChange={(e) => setFaturaForm({ ...faturaForm, vencimento: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  required
                  placeholder="0.00"
                  value={faturaForm.valor}
                  onChange={(e) => setFaturaForm({ ...faturaForm, valor: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={faturaForm.status} onValueChange={(val) => setFaturaForm({ ...faturaForm, status: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aberta">Em Aberto</SelectItem>
                    <SelectItem value="paga">Pago</SelectItem>
                    <SelectItem value="vencida">Vencida</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações da cobrança..."
                rows={2}
                value={faturaForm.observacoes}
                onChange={(e) => setFaturaForm({ ...faturaForm, observacoes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialog({ open: false, fatura: null })}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editFaturaMutation.isPending}>
                {editFaturaMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Nova Cobrança Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Cobrança Manual</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!faturaForm.paciente_id) {
                toast.error("Selecione um paciente.");
                return;
              }
              createFaturaMutation.mutate({
                paciente_id: faturaForm.paciente_id,
                competencia: faturaForm.competencia,
                vencimento: faturaForm.vencimento ? faturaForm.vencimento : null,
                valor: parseFloat(faturaForm.valor.replace(",", ".")),
                status: faturaForm.status,
                observacoes: faturaForm.observacoes,
              }, {
                onSuccess: () => {
                  setCreateDialog(false);
                  setFaturaForm({
                    paciente_id: "",
                    competencia: format(startOfMonth(new Date()), "yyyy-MM-dd"),
                    vencimento: "",
                    valor: "",
                    status: "aberta",
                    observacoes: "",
                  });
                }
              });
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label>Paciente</Label>
              <Select value={faturaForm.paciente_id} onValueChange={(val) => setFaturaForm({ ...faturaForm, paciente_id: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente..." />
                </SelectTrigger>
                <SelectContent>
                  {(pacientes || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Mês de Competência</Label>
                <Input
                  type="date"
                  required
                  value={faturaForm.competencia}
                  onChange={(e) => setFaturaForm({ ...faturaForm, competencia: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={faturaForm.vencimento}
                  onChange={(e) => setFaturaForm({ ...faturaForm, vencimento: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  required
                  placeholder="0.00"
                  value={faturaForm.valor}
                  onChange={(e) => setFaturaForm({ ...faturaForm, valor: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={faturaForm.status} onValueChange={(val) => setFaturaForm({ ...faturaForm, status: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aberta">Em Aberto</SelectItem>
                    <SelectItem value="paga">Pago</SelectItem>
                    <SelectItem value="vencida">Vencida</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações da cobrança..."
                rows={2}
                value={faturaForm.observacoes}
                onChange={(e) => setFaturaForm({ ...faturaForm, observacoes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createFaturaMutation.isPending}>
                {createFaturaMutation.isPending ? "Criando..." : "Criar Cobrança"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Faturas do Paciente Dialog */}
      <Dialog open={patientFaturasDialog.open} onOpenChange={(open) => setPatientFaturasDialog({ open, pacienteId: open ? patientFaturasDialog.pacienteId : "", pacienteNome: open ? patientFaturasDialog.pacienteNome : "" })}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-xl">Faturas de {patientFaturasDialog.pacienteNome}</DialogTitle>
              <div className="text-sm text-muted-foreground mt-1">
                Visualização de todas as cobranças vinculadas a este paciente.
              </div>
            </div>
            <Button
              size="sm"
              className="gap-1.5 mr-6 font-semibold cursor-pointer"
              onClick={() => {
                setFaturaForm({
                  paciente_id: patientFaturasDialog.pacienteId,
                  competencia: format(startOfMonth(new Date()), "yyyy-MM-dd"),
                  vencimento: "",
                  valor: "",
                  status: "aberta",
                  observacoes: "",
                });
                setCreateDialog(true);
              }}
            >
              <Plus className="h-4 w-4" /> Nova Cobrança
            </Button>
          </DialogHeader>
          
          <div className="py-4">
            {patientFaturas.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                Nenhuma fatura cadastrada para este paciente no período selecionado.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader className="bg-muted/40 font-semibold text-foreground">
                    <TableRow>
                      <TableHead>Competência</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Dias de Atraso</TableHead>
                      <TableHead className="w-[140px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patientFaturas.map((f: any) => {
                      const daysDelayed = getDaysDelayed(f);
                      return (
                        <TableRow key={f.id}>
                          <TableCell>
                            {f.competencia ? format(new Date(f.competencia + "T12:00:00"), "MM/yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            {f.vencimento ? format(new Date(f.vencimento + "T12:00:00"), "dd/MM/yyyy") : "—"}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {brl(Number(f.valor))}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                f.status === "paga"
                                  ? "default"
                                  : f.status === "vencida" || (f.status === "aberta" && daysDelayed > 0)
                                  ? "destructive"
                                  : f.status === "cancelada"
                                  ? "secondary"
                                  : "outline"
                              }
                              className={
                                f.status === "paga"
                                  ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
                                  : f.status === "aberta" && daysDelayed > 0
                                  ? "bg-rose-500 hover:bg-rose-600 text-white border-transparent"
                                  : f.status === "aberta"
                                  ? "bg-sky-500 hover:bg-sky-600 text-white border-transparent"
                                  : ""
                              }
                            >
                              {f.status === "aberta" && daysDelayed > 0
                                ? "Vencida (Atrasada)"
                                : f.status === "aberta"
                                ? "Em Aberto"
                                : f.status === "paga"
                                ? "Pago"
                                : f.status === "vencida"
                                ? "Vencida"
                                : "Cancelada"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {f.status === "paga" ? (
                              <div className="space-y-0.5">
                                <div>{f.pago_em ? format(new Date(f.pago_em), "dd/MM/yyyy") : "—"}</div>
                                <div className="font-semibold uppercase tracking-wider text-[10px] text-emerald-600 dark:text-emerald-400">
                                  {f.metodo || ""}
                                </div>
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {f.status === "paga" ? (
                              daysDelayed > 0 ? (
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                  Pago com {daysDelayed}d de atraso
                                </span>
                              ) : (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                  <Check className="h-3 w-3" /> Pago em dia
                                </span>
                              )
                            ) : f.status === "cancelada" ? (
                              "—"
                            ) : f.vencimento ? (
                              daysDelayed > 0 ? (
                                <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {daysDelayed} dias de atraso
                                </span>
                              ) : (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> No prazo
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Sem vencimento</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {f.status !== "paga" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Confirmar Pagamento"
                                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                  onClick={() => handleOpenConfirmPayment(f)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Editar Cobrança"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => handleOpenEdit(f)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Excluir Cobrança"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir Cobrança</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir esta cobrança? Todos os itens de faturamento associados a agendamentos serão mantidos, mas a cobrança em si será excluída.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                      onClick={() => deleteFaturaMutation.mutate(f.id)}
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DiretoriaPage() {
  const { loading } = useAuth();
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof window !== "undefined") {
      return window.sessionStorage.getItem("diretoria_unlocked") === "true";
    }
    return false;
  });

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!unlocked) {
    return (
      <PasswordGate
        onUnlock={() => {
          setUnlocked(true);
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem("diretoria_unlocked", "true");
          }
        }}
      />
    );
  }

  return <DiretoriaPageContent />;
}
