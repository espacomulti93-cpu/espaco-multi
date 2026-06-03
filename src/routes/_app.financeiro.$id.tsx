import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/financeiro/$id")({
  component: FaturaDetail,
});

type FaturaStatus = "aberta" | "paga" | "vencida" | "cancelada";
const statusLabel: Record<FaturaStatus, string> = {
  aberta: "Aberta", paga: "Paga", vencida: "Vencida", cancelada: "Cancelada",
};

function brl(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function FaturaDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: fatura, isLoading } = useQuery({
    queryKey: ["fatura", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faturas")
        .select("*, paciente:pacientes(id, nome)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: itens = [] } = useQuery({
    queryKey: ["fatura-itens", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fatura_itens")
        .select("*")
        .eq("fatura_id", id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const { error } = await supabase.from("faturas").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fatura atualizada");
      qc.invalidateQueries({ queryKey: ["fatura", id] });
      qc.invalidateQueries({ queryKey: ["faturas"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeFatura = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("faturas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fatura excluída");
      qc.invalidateQueries({ queryKey: ["faturas"] });
      navigate({ to: "/financeiro" });
    },
  });

  if (isLoading || !fatura) {
    return <div className="text-sm text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/financeiro">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>
        <div className="ml-auto flex gap-2">
          {fatura.status !== "paga" && (
            <Button
              size="sm"
              onClick={() =>
                updateStatus.mutate({
                  status: "paga",
                  pago_em: new Date().toISOString(),
                })
              }
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" /> Marcar como paga
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => removeFatura.mutate()}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Fatura — {fatura.paciente?.nome}
            <Badge>{statusLabel[fatura.status as FaturaStatus]}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Competência">{format(new Date(fatura.competencia), "MM/yyyy")}</Field>
          <Field label="Vencimento">
            {fatura.vencimento ? format(new Date(fatura.vencimento), "dd/MM/yyyy") : "—"}
          </Field>
          <Field label="Valor">{brl(Number(fatura.valor))}</Field>
          <Field label="Pago em">
            {fatura.pago_em ? format(new Date(fatura.pago_em), "dd/MM/yyyy HH:mm") : "—"}
          </Field>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Método de pagamento</Label>
            <Select
              value={fatura.metodo ?? ""}
              onValueChange={(v) => updateStatus.mutate({ metodo: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar…" />
              </SelectTrigger>
              <SelectContent>
                {["pix", "dinheiro", "cartao_credito", "cartao_debito", "transferencia", "boleto", "convenio", "outro"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Observações</Label>
            <Textarea
              defaultValue={fatura.observacoes ?? ""}
              onBlur={(e) => {
                if (e.target.value !== (fatura.observacoes ?? "")) {
                  updateStatus.mutate({ observacoes: e.target.value });
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {itens.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum item.</p>
          )}
          {itens.map((it: any) => (
            <div
              key={it.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div>
                <div className="text-sm font-medium">{it.descricao}</div>
                <div className="text-xs text-muted-foreground">
                  {it.quantidade} × {brl(Number(it.valor_unitario))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold">{brl(Number(it.total))}</div>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground text-center pt-2 italic">
            Estes itens são gerados automaticamente a partir da Agenda. Para modificar ou excluir sessões, altere o status ou remova o agendamento correspondente na Agenda.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}
