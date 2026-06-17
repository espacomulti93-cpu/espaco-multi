import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "recepcionista" | "profissional";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  roles: Role[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (nome: string, email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadRoles(s.user.id), 0);
      } else {
        setRoles([]);
      }
    });

    async function initializeAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        let activeSession = data.session;

        if (!activeSession) {
          const email = "clinica@espacomulti.com";
          const password = "ClinicaMulti2026!";

          const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            // Se o usuário genérico não existir, cria-o silenciosamente
            const { error: signUpError } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { nome: "Clínica Multi" },
              },
            });

            if (!signUpError) {
              const { data: retryData } = await supabase.auth.signInWithPassword({
                email,
                password,
              });
              activeSession = retryData.session;
            } else {
              console.error("Erro no auto-cadastro:", signUpError);
            }
          } else {
            activeSession = signInData.session;
          }
        }

        if (activeSession) {
          setSession(activeSession);
          await loadRoles(activeSession.user.id);
        }
      } catch (err) {
        console.error("Erro na inicialização silenciosa:", err);
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadRoles(uid: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r) => r.role as Role));
  }

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    signUp: async (nome, email, password) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nome }, emailRedirectTo: `${window.location.origin}/` },
      });
      return { error: error?.message ?? null };
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
