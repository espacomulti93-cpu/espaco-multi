import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/_fix-gaby")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("k") !== "tmp-7f3a9d2e") {
          return new Response("nope", { status: 404 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const email = "gabymartyns04@gmail.com";
        const newPassword = "Multi@2026";

        // Find user
        let userId: string | null = null;
        let createdNow = false;
        const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const found = list.data?.users?.find((u) => u.email?.toLowerCase() === email);
        if (found) {
          userId = found.id;
          const upd = await supabaseAdmin.auth.admin.updateUserById(found.id, {
            password: newPassword,
            email_confirm: true,
          });
          if (upd.error) return Response.json({ step: "update", error: upd.error.message }, { status: 500 });
        } else {
          const create = await supabaseAdmin.auth.admin.createUser({
            email,
            password: newPassword,
            email_confirm: true,
            user_metadata: { nome: "Gabriela Martins" },
          });
          if (create.error) return Response.json({ step: "create", error: create.error.message }, { status: 500 });
          userId = create.data.user!.id;
          createdNow = true;
        }

        // Ensure role
        const existingRole = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId!);
        if (!existingRole.data || existingRole.data.length === 0) {
          const ins = await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: userId!, role: "recepcionista" });
          if (ins.error) return Response.json({ step: "role", error: ins.error.message }, { status: 500 });
        }

        return Response.json({
          ok: true,
          userId,
          createdNow,
          email,
          tempPassword: newPassword,
          roles: existingRole.data?.map((r) => r.role) ?? ["recepcionista"],
        });
      },
    },
  },
});
