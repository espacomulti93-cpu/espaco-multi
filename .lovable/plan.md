## Plano

Aplicar migração no banco adicionando as colunas de assinatura digital na tabela `agendamentos`:

- `assinatura_responsavel` (text) — imagem/dados da assinatura
- `nome_assinante` (text) — nome de quem assinou
- `data_assinatura` (timestamptz) — momento da assinatura

### SQL da migração

```sql
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS assinatura_responsavel text,
  ADD COLUMN IF NOT EXISTS nome_assinante text,
  ADD COLUMN IF NOT EXISTS data_assinatura timestamp with time zone;
```

Como as colunas já constam em `src/integrations/supabase/types.ts`, nenhuma alteração de código TypeScript é necessária após rodar a migração — os tipos já estão alinhados. Se a migração detectar que as colunas já existem, o `IF NOT EXISTS` torna a operação idempotente e segura.
