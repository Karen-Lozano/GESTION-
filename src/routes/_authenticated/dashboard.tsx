import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const { role, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Cargando...</div>;
  if (role === "admin") return <Navigate to="/admin" />;
  if (role === "medico") return <Navigate to="/doctor" />;
  return <Navigate to="/patient" />;
}
