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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/patient")({
  component: PatientPage,
});

const PATIENT_NAV = [
  { to: "/patient", label: "Mis citas" },
  { to: "/patient/book", label: "Reservar cita" },
];

function statusColor(s: string) {
  return {
    pendiente: "bg-warning/20 text-warning-foreground",
    confirmada: "bg-primary/15 text-primary",
    completada: "bg-success/20 text-success-foreground",
    cancelada: "bg-destructive/15 text-destructive",
  }[s] ?? "";
}

function PatientPage() {
  const qc = useQueryClient();
  const { data: appts, isLoading } = useQuery({
    queryKey: ["my-appointments"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("appointments")
        .select("id, appointment_date, start_time, end_time, status, reason, notes, diagnosis, doctor_id, doctors(user_id, specialty_id, profiles:user_id(full_name), specialties(name))")
        .eq("patient_id", u.user!.id)
        .order("appointment_date", { ascending: false })
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").update({ status: "cancelada" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cita cancelada"); qc.invalidateQueries({ queryKey: ["my-appointments"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Mis citas médicas" roleLabel="Paciente" nav={PATIENT_NAV}>
      <div className="flex justify-between items-center mb-4">
        <p className="text-muted-foreground text-sm">Consulta el estado de tus citas y accede a diagnósticos.</p>
        <BookDialog />
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : !appts?.length ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="text-muted-foreground">Aún no tienes citas. Reserva una para comenzar.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {appts.map((a: any) => (
            <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">Dr(a). {a.doctors?.profiles?.full_name ?? "—"}</span>
                  <Badge className={statusColor(a.status)} variant="secondary">{a.status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {a.doctors?.specialties?.name ?? "Sin especialidad"} · {format(new Date(a.appointment_date + "T00:00"), "dd/MM/yyyy")} · {a.start_time?.slice(0,5)}–{a.end_time?.slice(0,5)}
                </div>
                {a.reason && <div className="text-sm mt-2"><span className="font-medium">Motivo:</span> {a.reason}</div>}
                {a.diagnosis && <div className="text-sm mt-1"><span className="font-medium">Diagnóstico:</span> {a.diagnosis}</div>}
                {a.notes && <div className="text-sm mt-1"><span className="font-medium">Notas del médico:</span> {a.notes}</div>}
              </div>
              {(a.status === "pendiente" || a.status === "confirmada") && (
                <Button size="sm" variant="outline" onClick={() => cancel.mutate(a.id)}>Cancelar</Button>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function BookDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [specialtyId, setSpecialtyId] = useState<string>("");
  const [doctorId, setDoctorId] = useState<string>("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");

  const { data: specialties } = useQuery({
    queryKey: ["specialties"],
    queryFn: async () => {
      const { data, error } = await supabase.from("specialties").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: doctors } = useQuery({
    queryKey: ["doctors", specialtyId],
    queryFn: async () => {
      if (!specialtyId) return [];
      const { data, error } = await supabase
        .from("doctors")
        .select("id, user_id, bio, profiles:user_id(full_name)")
        .eq("specialty_id", specialtyId);
      if (error) throw error;
      return data;
    },
    enabled: !!specialtyId,
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("appointments").insert({
        patient_id: u.user!.id,
        doctor_id: doctorId,
        appointment_date: date,
        start_time: start,
        end_time: end,
        reason,
        status: "pendiente",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cita solicitada. Espera confirmación del médico.");
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
      setOpen(false);
      setSpecialtyId(""); setDoctorId(""); setDate(""); setStart(""); setEnd(""); setReason("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Reservar cita</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva cita médica</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Especialidad</Label>
            <Select value={specialtyId} onValueChange={(v) => { setSpecialtyId(v); setDoctorId(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecciona una especialidad" /></SelectTrigger>
              <SelectContent>
                {specialties?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Médico</Label>
            <Select value={doctorId} onValueChange={setDoctorId} disabled={!specialtyId}>
              <SelectTrigger><SelectValue placeholder={specialtyId ? "Selecciona un médico" : "Elige especialidad primero"} /></SelectTrigger>
              <SelectContent>
                {doctors?.length ? doctors.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>Dr(a). {d.profiles?.full_name || "Sin nombre"}</SelectItem>
                )) : <div className="px-2 py-4 text-sm text-muted-foreground">No hay médicos</div>}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2 col-span-3"><Label>Fecha</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={format(new Date(), "yyyy-MM-dd")} /></div>
            <div className="space-y-2"><Label>Inicio</Label><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="space-y-2 col-span-2"><Label>Fin</Label><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Motivo</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe brevemente el motivo" /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={!doctorId || !date || !start || !end || create.isPending}>
            {create.isPending ? "Solicitando..." : "Solicitar cita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
