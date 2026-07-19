import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Stethoscope, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/40 to-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">
              M+
            </div>
            <span className="font-semibold text-lg">MediCitas</span>
          </div>
          <Link to="/auth">
            <Button>Ingresar</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 text-accent-foreground px-3 py-1 text-xs font-medium mb-6">
            <ShieldCheck className="h-3.5 w-3.5" /> Plataforma médica segura
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">
            Tu salud, <span className="text-primary">al alcance de un clic</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Sistema integral de citas médicas para pacientes, profesionales de la salud y administradores.
            Reserva, consulta y gestiona todo en un solo lugar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/auth">
              <Button size="lg">Crear cuenta</Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">Ya tengo cuenta</Button>
            </Link>
          </div>
        </section>

        <section className="mt-20 grid md:grid-cols-3 gap-6">
          {[
            { icon: Users, title: "Paciente", desc: "Busca médicos por especialidad, reserva y gestiona tus citas y consulta tu historial." },
            { icon: Stethoscope, title: "Médico", desc: "Administra tu agenda, define tu disponibilidad y registra diagnósticos y notas de consulta." },
            { icon: Calendar, title: "Administrador", desc: "Supervisa usuarios, especialidades y todas las citas del sistema." },
          ].map((f) => (
            <div key={f.title} className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary grid place-items-center mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} MediCitas
      </footer>
    </div>
  );
}
