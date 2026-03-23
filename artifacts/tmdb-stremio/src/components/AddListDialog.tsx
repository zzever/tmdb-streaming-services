import React, { useState } from "react";
import { X, List, ExternalLink, BookMarked } from "lucide-react";
import { useLists } from "@/context/ListsContext";
import type { ListSourceParams } from "@workspace/api-client-react/src/generated/api";

interface AddListDialogProps {
  onClose: () => void;
}

type Step = "choose" | "mdblist" | "trakt";

export function AddListDialog({ onClose }: AddListDialogProps) {
  const { addList } = useLists();
  const [step, setStep] = useState<Step>("choose");

  const [mdbListId, setMdbListId]   = useState("");
  const [mdbApiKey, setMdbApiKey]   = useState("");
  const [mdbName, setMdbName]       = useState("");

  const [traktUser, setTraktUser]   = useState("");
  const [traktSlug, setTraktSlug]   = useState("");
  const [traktKey, setTraktKey]     = useState("");
  const [traktName, setTraktName]   = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleAddMDBList = async () => {
    if (!mdbListId.trim() || !mdbApiKey.trim()) {
      setError("Rellena todos los campos");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const params: ListSourceParams = { source: "mdblist", listId: mdbListId.trim(), apiKey: mdbApiKey.trim() };
      const resp = await fetch(`/api/streaming/list?source=mdblist&listId=${mdbListId.trim()}&apiKey=${mdbApiKey.trim()}`);
      if (!resp.ok) throw new Error("No se pudo conectar con MDBList. Verifica el ID y la clave.");
      const data = await resp.json();
      addList(mdbName.trim() || data.name || "Lista MDBList", params);
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTrakt = async () => {
    if (!traktUser.trim() || !traktSlug.trim() || !traktKey.trim()) {
      setError("Rellena todos los campos");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const params: ListSourceParams = { source: "trakt", username: traktUser.trim(), slug: traktSlug.trim(), clientId: traktKey.trim() };
      const resp = await fetch(`/api/streaming/list?source=trakt&username=${traktUser.trim()}&slug=${traktSlug.trim()}&clientId=${traktKey.trim()}`);
      if (!resp.ok) throw new Error("No se pudo conectar con Trakt. Verifica los datos.");
      const data = await resp.json();
      addList(traktName.trim() || data.name || "Lista Trakt", params);
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-md rounded-3xl p-7 shadow-2xl"
        style={{ background: "rgba(18,18,30,0.97)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {step === "choose" && (
          <>
            <h2 className="text-xl font-display font-bold text-white mb-1">Añadir lista</h2>
            <p className="text-white/40 text-sm mb-6">Conecta tu lista de MDBList o Trakt</p>
            <div className="space-y-3">
              <button
                onClick={() => setStep("mdblist")}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 hover:brightness-125"
                style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)" }}
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
                  <BookMarked className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">MDBList</p>
                  <p className="text-white/40 text-xs mt-0.5">Importa cualquier lista con tu API key</p>
                </div>
                <ExternalLink className="w-4 h-4 text-white/20 ml-auto shrink-0" />
              </button>

              <button
                onClick={() => setStep("trakt")}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 hover:brightness-125"
                style={{ background: "rgba(237,76,40,0.07)", border: "1px solid rgba(237,76,40,0.2)" }}
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                  <List className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Trakt</p>
                  <p className="text-white/40 text-xs mt-0.5">Importa listas públicas de tu perfil</p>
                </div>
                <ExternalLink className="w-4 h-4 text-white/20 ml-auto shrink-0" />
              </button>
            </div>
          </>
        )}

        {step === "mdblist" && (
          <>
            <button onClick={() => setStep("choose")} className="text-white/30 hover:text-white/60 text-xs mb-4 flex items-center gap-1 transition-colors">
              ← Volver
            </button>
            <h2 className="text-xl font-display font-bold text-white mb-1">Conectar MDBList</h2>
            <p className="text-white/40 text-sm mb-5">
              Encuentra el ID de tu lista en{" "}
              <a href="https://mdblist.com" target="_blank" rel="noopener" className="text-yellow-400 underline">mdblist.com</a>
              {" "}→ tu lista → compartir → número en la URL
            </p>
            <div className="space-y-3">
              <Field label="ID de la lista (número)" placeholder="123456" value={mdbListId} onChange={setMdbListId} />
              <Field label="API Key de MDBList" placeholder="tu_api_key" value={mdbApiKey} onChange={setMdbApiKey} />
              <Field label="Nombre personalizado (opcional)" placeholder="Mis favoritas" value={mdbName} onChange={setMdbName} />
            </div>
            {error && <p className="mt-3 text-red-400 text-xs">{error}</p>}
            <button
              onClick={handleAddMDBList}
              disabled={saving}
              className="mt-5 w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:brightness-110 disabled:opacity-50"
              style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}
            >
              {saving ? "Conectando…" : "Añadir lista"}
            </button>
          </>
        )}

        {step === "trakt" && (
          <>
            <button onClick={() => setStep("choose")} className="text-white/30 hover:text-white/60 text-xs mb-4 flex items-center gap-1 transition-colors">
              ← Volver
            </button>
            <h2 className="text-xl font-display font-bold text-white mb-1">Conectar Trakt</h2>
            <p className="text-white/40 text-sm mb-5">
              Necesitas un Client ID de{" "}
              <a href="https://trakt.tv/oauth/applications" target="_blank" rel="noopener" className="text-orange-400 underline">trakt.tv/oauth/applications</a>
              . Las listas deben ser públicas.
            </p>
            <div className="space-y-3">
              <Field label="Usuario de Trakt" placeholder="tu_usuario" value={traktUser} onChange={setTraktUser} />
              <Field label="Slug de la lista" placeholder="mi-lista-favorita" value={traktSlug} onChange={setTraktSlug} />
              <Field label="Client ID de Trakt" placeholder="abc123..." value={traktKey} onChange={setTraktKey} />
              <Field label="Nombre personalizado (opcional)" placeholder="Mis listas Trakt" value={traktName} onChange={setTraktName} />
            </div>
            {error && <p className="mt-3 text-red-400 text-xs">{error}</p>}
            <button
              onClick={handleAddTrakt}
              disabled={saving}
              className="mt-5 w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:brightness-110 disabled:opacity-50"
              style={{ background: "rgba(237,76,40,0.15)", border: "1px solid rgba(237,76,40,0.3)" }}
            >
              {saving ? "Conectando…" : "Añadir lista"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, placeholder, value, onChange }: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-white/40 mb-1">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-primary/40"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
      />
    </div>
  );
}
