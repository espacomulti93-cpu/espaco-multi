import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
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

  // Fetch Invoices
  const { data: faturas = [], isLoading: loadingFaturas } = useQuery({
    queryKey: ["dir-faturas", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faturas")
        .select("id, valor, status, competencia")
        .gte("competencia", inicio)
        .lte("competencia", fim);
      if (error) throw error;
      return data;
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
    const faturamentoRecebido = faturas
      .filter((f) => f.status === "paga")
      .reduce((acc, f) => acc + Number(f.valor), 0);

    // Faturamento A Receber (Abertas)
    const faturamentoAReceber = faturas
      .filter((f) => f.status === "aberta")
      .reduce((acc, f) => acc + Number(f.valor), 0);

    // Faturamento Vencido (Vencidas)
    const faturamentoVencido = faturas
      .filter((f) => f.status === "vencida")
      .reduce((acc, f) => acc + Number(f.valor), 0);

    // Faturamento Pendente (Abertas/Vencidas)
    const faturamentoPendente = faturamentoAReceber + faturamentoVencido;

    // Faturamento Geral (Total Faturas)
    const faturamentoTotal = faturas
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
