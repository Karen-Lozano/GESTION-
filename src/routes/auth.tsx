import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("¡Bienvenido!");
    navigate({ to: "/dashboard" });
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: String(fd.get("full_name")),
          phone: String(fd.get("phone") ?? ""),
          role: String(fd.get("role")),
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Cuenta creada");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-background via-secondary/40 to-background">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-6">
          <div className="inline-flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">M+</div>
            <span className="font-semibold text-lg">MediCitas</span>
          </div>
        </Link>

        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Ingresando..." : "Ingresar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="s-name">Nombre completo</Label>
                  <Input id="s-name" name="full_name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-email">Correo</Label>
                  <Input id="s-email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-phone">Teléfono</Label>
                  <Input id="s-phone" name="phone" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-password">Contraseña</Label>
                  <Input id="s-password" name="password" type="password" required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de cuenta</Label>
                  <RadioGroup name="role" defaultValue="paciente" className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 border border-border rounded-md px-3 py-2 cursor-pointer hover:bg-secondary">
                      <RadioGroupItem value="paciente" /> <span>Paciente</span>
                    </label>
                    <label className="flex items-center gap-2 border border-border rounded-md px-3 py-2 cursor-pointer hover:bg-secondary">
                      <RadioGroupItem value="medico" /> <span>Médico</span>
                    </label>
                  </RadioGroup>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creando..." : "Crear cuenta"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Los administradores se asignan manualmente por otro admin.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
