## Diagnóstico

O erro `Invalid login credentials` ocorre no Supabase Auth **antes** de qualquer checagem de role/perfil. Ou seja: o problema é uma das três:

1. O e-mail `gabymartyns04@gmail.com` não existe em `auth.users`.
2. A senha digitada está incorreta.
3. O e-mail ainda não foi confirmado (em alguns projetos isso bloqueia o login).

Atribuir role em `user_roles` **não resolve** o "Invalid login credentials" — a role só é lida depois do login bem-sucedido (veja `useAuth.loadRoles`). Mas, como você pediu, vou garantir a role também, para ela não ficar sem acesso depois de entrar.

## Passos

1. **Verificar a conta** em `auth.users` para `gabymartyns04@gmail.com`:
   - existe? `email_confirmed_at` está preenchido? quando foi o último `last_sign_in_at`?
   - se a conta não existir, criar via admin (e-mail + senha provisória, já confirmada).

2. **Resetar a senha** dela para uma senha provisória (ex.: `Multi@2026`) usando a API admin do Supabase (`auth.admin.updateUserById`). Ela troca depois.
   - Alternativa: enviar e-mail de recuperação (`resetPasswordForEmail`) — exige a página `/reset-password`, que **não existe** hoje no projeto. Por isso o caminho rápido é redefinir manualmente.

3. **Garantir a role** em `public.user_roles`:
   - Inserir `(user_id = <id da Gabriela>, role = 'recepcionista')` se ainda não existir. Confirme se a role correta é `recepcionista`, `profissional` ou `admin`.

4. **Entregar as credenciais** novas no chat (e-mail + senha provisória) e orientar trocar a senha no primeiro acesso.

## Detalhes técnicos

- Os passos 1–3 rodam via SQL/admin API no Supabase (projeto `xjlmsgwqjjpuqpbrlvwr`). Não há mudança de código de aplicação necessária.
- Roles válidas no enum atual: `admin`, `recepcionista`, `profissional`.
- Não vou mexer em RLS nem em `useAuth` — o fluxo de login em si está correto.

## Confirmar antes de executar

- Qual **role** atribuir à Gabriela? (`recepcionista` / `profissional` / `admin`)
- Posso definir a senha provisória como **`Multi@2026`** ou você prefere outra?
- Se a conta **não existir**, devo criá-la com esse e-mail mesmo?
