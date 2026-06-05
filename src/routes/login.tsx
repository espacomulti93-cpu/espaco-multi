import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: LoginPageRedirect,
});

function LoginPageRedirect() {
  return <Navigate to="/dashboard" replace />;
}
