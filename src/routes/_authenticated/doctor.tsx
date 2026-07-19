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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/doctor")({
  component: DoctorPage,
});

const DOCTOR_NAV = [{ to: "/doctor", label: "Panel médico" }];
const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function statusColor(s: string) {
  return {
    pendiente: "bg-warning/20 text-warning-foreground",
    confirmada: "bg-primary/15 text-primary",
    completada: "bg-success/20 text-success-foreground",
    cancelada: "bg-destructive/15 text-destructive",
  }[s] ?? "";
}

function DoctorPage() {
  return (
    <AppShell title="Panel del médico" roleLabel="Médico" nav={DOCTOR_NAV}>
      <Tabs defaultValue="agenda">
        <TabsList>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="availability">Disponibilidad</TabsTrigger>
          <TabsTrigger value="profile">Mi perfil</TabsTrigger>
        </TabsList>
        <TabsContent value="agenda" className="mt-6"><Agenda /></TabsContent>
        <TabsContent value="availability" className="mt-6"><Availability /></TabsContent>
        <TabsContent value="profile" className="mt-6"><DoctorProfile /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function useDoctorId() {
  return useQuery({
    queryKey: ["me-doctor"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("doctors").select("*, specialties(name)").eq("user_id", u.user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function Agenda() {
  const qc = useQueryClient();
  const { data: doctor } = useDoctorId();
  const [editing, setEditing] = useState<any>(null);

  const { data: appts } = useQuery({
    queryKey: ["doctor-appts", doctor?.id],
    enabled: !!doctor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, patient:patient_id(id), profiles:patient_id(full_name, phone)")
        .eq("doctor_id", doctor!.id)
        .order("appointment_date", { ascending: false })
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async (v: { id: string; patch: Partial<{ status: "pendiente" | "confirmada" | "completada" | "cancelada"; notes: string | null; diagnosis: string | null }> }) => {
      const { error } = await supabase.from("appointments").update(v.patch).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["doctor-appts"] }); toast.success("Cita actualizada"); setEditing(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!doctor) return <p className="text-muted-foreground">Cargando perfil médico...</p>;

  return (
    <>
      {!appts?.length ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">Sin citas por el momento.</div>
      ) : (
        <div className="grid gap-3">
          {appts.map((a: any) => (
            <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex flex-wrap justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{a.profiles?.full_name ?? "Paciente"}</span>
                  <Badge className={statusColor(a.status)} variant="secondary">{a.status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(a.appointment_date + "T00:00"), "dd/MM/yyyy")} · {a.start_time?.slice(0,5)}–{a.end_time?.slice(0,5)}
                  {a.profiles?.phone && <> · Tel: {a.profiles.phone}</>}
                </div>
                {a.reason && <div className="text-sm mt-2"><span className="font-medium">Motivo:</span> {a.reason}</div>}
                {a.diagnosis && <div className="text-sm mt-1"><span className="font-medium">Diagnóstico:</span> {a.diagnosis}</div>}
                {a.notes && <div className="text-sm mt-1"><span className="font-medium">Notas:</span> {a.notes}</div>}
              </div>
              <div className="flex flex-wrap gap-2">
                {a.status === "pendiente" && (
                  <Button size="sm" onClick={() => update.mutate({ id: a.id, patch: { status: "confirmada" } })}>Confirmar</Button>
                )}
                {a.status !== "cancelada" && a.status !== "completada" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditing(a)}>Notas / Completar</Button>
                    <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: a.id, patch: { status: "cancelada" } })}>Rechazar</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Notas de consulta</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-2"><Label>Diagnóstico</Label><Textarea defaultValue={editing.diagnosis ?? ""} onChange={(e) => (editing.diagnosis = e.target.value)} /></div>
              <div className="space-y-2"><Label>Notas / indicaciones</Label><Textarea defaultValue={editing.notes ?? ""} onChange={(e) => (editing.notes = e.target.value)} /></div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => update.mutate({ id: editing.id, patch: { diagnosis: editing.diagnosis, notes: editing.notes } })}>Guardar</Button>
            <Button onClick={() => update.mutate({ id: editing.id, patch: { diagnosis: editing.diagnosis, notes: editing.notes, status: "completada" } })}>Marcar como completada</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Availability() {
  const qc = useQueryClient();
  const { data: doctor } = useDoctorId();
  const [day, setDay] = useState("1");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");

  const { data: slots } = useQuery({
    queryKey: ["availability", doctor?.id],
    enabled: !!doctor?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("doctor_availability").select("*").eq("doctor_id", doctor!.id).order("day_of_week").order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("doctor_availability").insert({ doctor_id: doctor!.id, day_of_week: Number(day), start_time: start, end_time: end });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Horario añadido"); qc.invalidateQueries({ queryKey: ["availability"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("doctor_availability").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability"] }),
  });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold mb-3">Agregar franja horaria</h3>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Día</Label>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2"><Label>Inicio</Label><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="space-y-2"><Label>Fin</Label><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <Button onClick={() => add.mutate()} disabled={!doctor}>Añadir</Button>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold mb-3">Mis franjas</h3>
        {!slots?.length ? <p className="text-sm text-muted-foreground">Sin franjas configuradas.</p> : (
          <ul className="space-y-2">
            {slots.map((s) => (
              <li key={s.id} className="flex justify-between items-center border-b border-border py-2 last:border-0">
                <span className="text-sm">{DAYS[s.day_of_week]} · {s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</span>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(s.id)}>Eliminar</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DoctorProfile() {
  const qc = useQueryClient();
  const { data: doctor } = useDoctorId();
  const { data: specialties } = useQuery({
    queryKey: ["specialties"],
    queryFn: async () => (await supabase.from("specialties").select("id, name").order("name")).data ?? [],
  });
  const [bio, setBio] = useState(doctor?.bio ?? "");
  const [license, setLicense] = useState(doctor?.license_number ?? "");
  const [fee, setFee] = useState<string>(doctor?.consultation_fee?.toString() ?? "");
  const [specialtyId, setSpecialtyId] = useState(doctor?.specialty_id ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("doctors").update({
        bio, license_number: license, consultation_fee: fee ? Number(fee) : null, specialty_id: specialtyId || null,
      }).eq("id", doctor!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Perfil actualizado"); qc.invalidateQueries({ queryKey: ["me-doctor"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!doctor) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-6 max-w-xl space-y-4">
      <div className="space-y-2"><Label>Especialidad</Label>
        <Select value={specialtyId ?? ""} onValueChange={setSpecialtyId}>
          <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
          <SelectContent>{specialties?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>Cédula profesional</Label><Input value={license} onChange={(e) => setLicense(e.target.value)} /></div>
      <div className="space-y-2"><Label>Tarifa de consulta</Label><Input type="number" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} /></div>
      <div className="space-y-2"><Label>Biografía</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} /></div>
      <Button onClick={() => save.mutate()}>Guardar cambios</Button>
    </div>
  );
}
