import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

const ADMIN_NAV = [{ to: "/admin", label: "Administración" }];

function AdminPage() {
  return (
    <AppShell title="Panel de administración" roleLabel="Administrador" nav={ADMIN_NAV}>
      <Tabs defaultValue="stats">
        <TabsList>
          <TabsTrigger value="stats">Resumen</TabsTrigger>
          <TabsTrigger value="specialties">Especialidades</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="appts">Citas</TabsTrigger>
        </TabsList>
        <TabsContent value="stats" className="mt-6"><Stats /></TabsContent>
        <TabsContent value="specialties" className="mt-6"><Specialties /></TabsContent>
        <TabsContent value="users" className="mt-6"><Users /></TabsContent>
        <TabsContent value="appts" className="mt-6"><AllAppts /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Stats() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [{ count: users }, { count: doctors }, { count: appts }, { count: pending }] = await Promise.all([
        supabase.from("profiles").select("*", { head: true, count: "exact" }),
        supabase.from("doctors").select("*", { head: true, count: "exact" }),
        supabase.from("appointments").select("*", { head: true, count: "exact" }),
        supabase.from("appointments").select("*", { head: true, count: "exact" }).eq("status", "pendiente"),
      ]);
      return { users, doctors, appts, pending };
    },
  });
  const cards = [
    { label: "Usuarios", value: data?.users ?? "—" },
    { label: "Médicos", value: data?.doctors ?? "—" },
    { label: "Citas totales", value: data?.appts ?? "—" },
    { label: "Citas pendientes", value: data?.pending ?? "—" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-card border border-border rounded-xl p-5">
          <div className="text-sm text-muted-foreground">{c.label}</div>
          <div className="text-3xl font-bold mt-1">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

function Specialties() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const { data: items } = useQuery({
    queryKey: ["all-specialties"],
    queryFn: async () => (await supabase.from("specialties").select("*").order("name")).data ?? [],
  });
  const add = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("specialties").insert({ name, description: desc }); if (error) throw error; },
    onSuccess: () => { toast.success("Especialidad añadida"); setName(""); setDesc(""); qc.invalidateQueries({ queryKey: ["all-specialties"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("specialties").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-specialties"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold mb-3">Nueva especialidad</h3>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Descripción</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <Button onClick={() => add.mutate()} disabled={!name}>Añadir</Button>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold mb-3">Listado</h3>
        <ul className="space-y-2">
          {items?.map((s) => (
            <li key={s.id} className="flex justify-between items-center border-b border-border py-2 last:border-0">
              <div>
                <div className="font-medium text-sm">{s.name}</div>
                {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(s.id)}>Eliminar</Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Users() {
  const qc = useQueryClient();
  const { data: rows } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, phone, created_at").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, string[]>();
      roles?.forEach((r) => { const arr = roleMap.get(r.user_id) ?? []; arr.push(r.role); roleMap.set(r.user_id, arr); });
      return (profs ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
    },
  });

  const grantAdmin = useMutation({
    mutationFn: async (userId: string) => { const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" }); if (error) throw error; },
    onSuccess: () => { toast.success("Rol admin concedido"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const revokeAdmin = useMutation({
    mutationFn: async (userId: string) => { const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin"); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left">
          <tr>
            <th className="p-3">Nombre</th><th className="p-3">Teléfono</th><th className="p-3">Roles</th><th className="p-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows?.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="p-3">{r.full_name || <span className="text-muted-foreground">Sin nombre</span>}</td>
              <td className="p-3">{r.phone ?? "—"}</td>
              <td className="p-3 flex gap-1 flex-wrap">{r.roles.map((rl) => <Badge key={rl} variant="secondary">{rl}</Badge>)}</td>
              <td className="p-3 text-right">
                {r.roles.includes("admin")
                  ? <Button size="sm" variant="ghost" onClick={() => revokeAdmin.mutate(r.id)}>Quitar admin</Button>
                  : <Button size="sm" variant="outline" onClick={() => grantAdmin.mutate(r.id)}>Hacer admin</Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AllAppts() {
  const { data } = useQuery({
    queryKey: ["admin-appts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, patient_profile:patient_id(full_name), doctors(profiles:user_id(full_name), specialties(name))")
        .order("appointment_date", { ascending: false })
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left">
          <tr>
            <th className="p-3">Fecha</th><th className="p-3">Paciente</th><th className="p-3">Médico</th><th className="p-3">Especialidad</th><th className="p-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((a: any) => (
            <tr key={a.id} className="border-t border-border">
              <td className="p-3">{format(new Date(a.appointment_date + "T00:00"), "dd/MM/yyyy")} {a.start_time?.slice(0,5)}</td>
              <td className="p-3">{a.patient_profile?.full_name ?? "—"}</td>
              <td className="p-3">{a.doctors?.profiles?.full_name ?? "—"}</td>
              <td className="p-3">{a.doctors?.specialties?.name ?? "—"}</td>
              <td className="p-3"><Badge variant="secondary">{a.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
