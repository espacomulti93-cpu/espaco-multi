## Problema

Ao editar um agendamento existente na aba **Agenda**, o card no calendário não migra para o novo horário nem mostra o nome do novo paciente após salvar. O toast "Agendamento atualizado" aparece, sugerindo que a mutação roda, mas a UI fica desincronizada (ou o `UPDATE` não persiste todos os campos esperados).

## Causas identificadas em `src/routes/_app.agenda.tsx`

1. **Payload de update por spread (`...form`) sem campos extras importantes** — o spread inclui o `form` original, mas não há garantia de que `tipoAgendamento` (que altera `observacoes`) seja considerado quando se faz update parcial recorrente; além disso, o spread silenciosamente passa o `servico_id` antigo antes de ser sobrescrito, dificultando depuração.
2. **`hasOtherFieldsChanged` não inclui `status` nem `tipoAgendamento`** — em séries recorrentes, mudar só o status pula a confirmação de recorrência, mas mudar tipo+observação não dispara o diálogo, podendo levar o usuário a salvar achando que mudou tudo.
3. **`sortedPatientAgs` faz override otimista do item editado** com `form.data_inicio`/`form.paciente_id`, mas só dentro do dialog (lista lateral). Isso pode dar falsa impressão de que "mudou" enquanto o calendário principal mostra dados antigos.
4. **Invalidação não aguardada** — `onSaved` dispara `qc.invalidateQueries({ queryKey: ["ags"] })` sem `await`, e o dialog fecha imediatamente. Se houver erro de refetch silencioso (ex.: RLS bloqueando read após mudar paciente), o calendário continua exibindo a versão em cache.
5. **`payload` inclui `recorrencia` mesmo em occurrence única** — quando o usuário escolhe "Não" no diálogo de recorrência, o update altera `recorrencia` do registro filho para o valor do form (geralmente igual ao original, mas pode haver casos onde divergiu se o usuário trocou a recorrência por engano).
6. **Erros silenciosos** — `save.mutationFn` lança o erro do Supabase mas, se a query retornar `count: 0` (RLS sem permissão de UPDATE em `paciente_id`/`profissional_id`), nenhum erro é gerado e o toast de sucesso aparece mesmo sem alteração persistida.

## Correções

### 1. Payload de UPDATE explícito e auditável
Substituir `{ ...form, ... }` por um objeto literal com apenas os campos que devem ser atualizados, na seção `else` de `save.mutationFn` (linhas ~1082-1087) e na seção `updateAllFuture` (linhas ~1046-1058). Garantir que sempre incluam: `paciente_id`, `profissional_id`, `servico_id`, `data_inicio`, `data_fim`, `status`, `recorrencia`, `observacoes`, `sala_id`.

### 2. Forçar leitura de retorno do UPDATE
Adicionar `.select("id")` no `.update(...)` e validar que retornou uma linha. Se `data?.length === 0`, lançar erro "Atualização bloqueada (RLS/permissão)". Isso elimina o falso positivo do toast.

### 3. Aguardar refetch antes de fechar o dialog
Mudar `onSaved` (linhas 269-274) para `async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["ags"] }), qc.invalidateQueries({ queryKey: ["patient-ags-dialog"] }), qc.invalidateQueries({ queryKey: ["faturas"] })]); setDialog({ open: false }); }`. Assim o calendário já mostra o card no novo slot quando o dialog fecha.

### 4. Incluir `status` e `tipoAgendamento` no `hasOtherFieldsChanged`
Em `handleSubmit` (linhas 1266-1273) e no equivalente dentro de `save.mutationFn` (linhas 1010-1017), adicionar comparações para `form.status !== (editing.status ?? "pendente")` e `tipoAgendamento !== initialTipo` (capturar o tipo inicial em uma const fora do `useState`).

### 5. Remover override otimista enganoso em `sortedPatientAgs`
A lista lateral de "Todos os Agendamentos do Paciente" deve refletir o banco de dados, não o form em edição. Remover o `mappedAgs.map(...)` que substitui campos pelo `form.*` (linhas 659-691) e mostrar somente os dados crus de `patientAgs`. Isso evita a impressão visual de que a mudança "aconteceu" quando ainda nem foi salva.

### 6. Logar erros de sync financeiro
`syncAgendamentoFinanceiro` (linha 507) já tem `console.error` no catch — adicionar `toast.warning("Atualização salva, mas houve falha ao sincronizar financeiro")` para não silenciar.

## Validação

Após as mudanças, rodar `bun run build` para garantir tipos OK, e em seguida testar manualmente no preview:
- Editar horário de um agendamento simples → card deve aparecer no novo slot ao fechar dialog.
- Editar paciente de um agendamento → nome no card deve atualizar.
- Editar agendamento recorrente, escolher "Não" → só a ocorrência muda.
- Editar agendamento recorrente, escolher "Ok" → todas futuras mudam.

## Arquivo afetado
- `src/routes/_app.agenda.tsx` (único arquivo modificado)
