"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Hourglass } from "lucide-react";
import { toast } from "sonner";

import { pedirProrroga } from "@/lib/actions/employee-portal";

/** Margen de espera semanal antes de que el servicio se cancele por demora. */
export default function PedirProrroga({
  servicioId,
  prorrogasSemanalesUsadas,
  prorrogasSemanalesRestantes,
  proximaProrrogaMinutos,
  token,
}: {
  servicioId: string;
  prorrogasSemanalesUsadas: number;
  prorrogasSemanalesRestantes: number;
  proximaProrrogaMinutos: number | null;
  token?: string;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, startTransition] = useTransition();

  if (prorrogasSemanalesRestantes <= 0 || !proximaProrrogaMinutos) {
    return null;
  }

  function solicitar() {
    startTransition(async () => {
      const resultado = await pedirProrroga(servicioId, token);
      if (!resultado.success) {
        toast.error(resultado.error);
        return;
      }
      const minutos = resultado.minutos ?? proximaProrrogaMinutos;
      toast.success(
        resultado.restantes === 0
          ? minutos + " minutos mas. Era tu ultima prorroga semanal."
          : minutos + " minutos mas. Te queda " + resultado.restantes + " esta semana.",
      );
      setConfirmando(false);
      router.refresh();
    });
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-xs font-semibold uppercase tracking-wider text-gray-300 transition-colors hover:border-[#C5A55A] hover:text-[#C5A55A]"
      >
        <Hourglass size={16} />
        Pedir {proximaProrrogaMinutos} minutos mas
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[#C5A55A]/30 bg-[#C5A55A]/[0.05] p-3.5">
      <p className="mb-3 text-center text-[11px] leading-relaxed text-gray-400">
        Se avisa al chofer de que la espera se alarga. Esta sera tu prorroga{" "}
        {prorrogasSemanalesUsadas + 1} de 2 de esta semana.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pendiente}
          onClick={() => setConfirmando(false)}
          className="rounded-lg border border-white/10 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-200 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={pendiente}
          aria-busy={pendiente}
          onClick={solicitar}
          className="rounded-lg border border-[#C5A55A]/50 py-2.5 text-xs font-bold uppercase tracking-wider text-[#E8D5A3] transition-colors hover:bg-[#C5A55A] hover:text-black disabled:opacity-50"
        >
          {pendiente ? "Pidiendo" : "Confirmar"}
        </button>
      </div>
    </div>
  );
}
