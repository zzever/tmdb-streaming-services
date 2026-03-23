import React, { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Copy, Check, Server, Github, Terminal, Key, Rocket, Package, ExternalLink } from "lucide-react";

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="relative rounded-xl overflow-hidden mt-2"
      style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-[10px] font-mono text-white/25 uppercase tracking-widest">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="px-4 py-3 overflow-x-auto scrollbar-hide">
        <code className="text-[13px] font-mono text-white/70 leading-relaxed whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}

function Step({ number, title, children, icon }: StepProps) {
  return (
    <div className="relative flex gap-5">
      {/* Vertical line */}
      <div className="flex flex-col items-center">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 z-10"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span className="text-white/60">{icon}</span>
        </div>
        <div className="w-px flex-1 mt-2" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold text-white/25 tabular-nums">0{number}</span>
          <h3 className="text-base font-display font-bold text-white/90">{title}</h3>
        </div>
        <div className="text-sm text-white/45 leading-relaxed space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}

function EnvRow({ name, description, required = true, example }: { name: string; description: string; required?: boolean; example?: string }) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 px-4 py-3 rounded-xl"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="shrink-0">
        <code className="text-[12px] font-mono text-indigo-300/80">{name}</code>
        {required ? (
          <span className="ml-2 text-[10px] font-semibold text-red-400/70 uppercase tracking-wider">requerida</span>
        ) : (
          <span className="ml-2 text-[10px] font-semibold text-white/25 uppercase tracking-wider">opcional</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-white/45">{description}</p>
        {example && (
          <p className="text-[11px] font-mono text-white/25 mt-0.5">Ej: {example}</p>
        )}
      </div>
    </div>
  );
}

const deployOptions = [
  {
    name: "Railway",
    description: "Despliegue automático desde GitHub. Plan gratuito disponible.",
    url: "https://railway.app",
    steps: "New Project → Deploy from GitHub → Add variables de entorno.",
    color: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.25)",
    badge: "Recomendado",
  },
  {
    name: "Render",
    description: "Web services con despliegue continuo desde GitHub.",
    url: "https://render.com",
    steps: "New Web Service → Connect repo → Environment → Deploy.",
    color: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.22)",
    badge: "Gratuito",
  },
  {
    name: "Fly.io",
    description: "Despliegue globalizado con Docker incluido.",
    url: "https://fly.io",
    steps: "fly launch → fly secrets set → fly deploy.",
    color: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.22)",
    badge: "Docker",
  },
];

export default function SelfHost() {
  return (
    <div className="min-h-screen relative" style={{ background: "#080912" }}>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/80 text-sm transition-colors mb-8 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Volver al inicio
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <Server className="w-4 h-4 text-white/60" />
            </div>
            <span className="text-xs uppercase tracking-widest text-white/30 font-semibold">Self-hosting</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold mb-3">
            <span className="gradient-text">Aloja</span>
            <span className="text-white/80"> tu propia instancia</span>
          </h1>
          <p className="text-white/35 text-sm leading-relaxed max-w-xl">
            Puedes clonar este proyecto, configurarlo con tu propia API key de TMDB y desplegarlo
            gratuitamente en cualquier plataforma compatible con Node.js.
          </p>
        </div>

        {/* Steps */}
        <div>
          <Step number={1} title="Clona el repositorio" icon={<Github className="w-4 h-4" />}>
            <p>Haz fork del proyecto en GitHub o clónalo directamente en tu máquina:</p>
            <CodeBlock code={`git clone https://github.com/tu-usuario/tmdb-stremio.git
cd tmdb-stremio`} />
          </Step>

          <Step number={2} title="Instala las dependencias" icon={<Package className="w-4 h-4" />}>
            <p>El proyecto usa <strong className="text-white/65">pnpm</strong> como gestor de paquetes en un monorepo. Si no lo tienes instalado:</p>
            <CodeBlock code={`npm install -g pnpm`} />
            <p className="mt-3">Instala todas las dependencias del workspace:</p>
            <CodeBlock code={`pnpm install`} />
          </Step>

          <Step number={3} title="Configura las variables de entorno" icon={<Key className="w-4 h-4" />}>
            <p>Crea un archivo <code className="text-indigo-300/80 font-mono text-[12px]">.env</code> en la raíz del proyecto con las siguientes variables:</p>
            <CodeBlock code={`# API Server
TMDB_API_KEY=tu_api_key_aqui
PORT=8080`} language="env" />

            <div className="mt-4 space-y-2">
              <EnvRow
                name="TMDB_API_KEY"
                description="Tu API key de The Movie Database. Regístrate gratis en themoviedb.org → Settings → API."
                example="859cc2e71ad61f716670e302a58a9603"
              />
              <EnvRow
                name="PORT"
                description="Puerto en el que escucha el servidor API. En producción suele ser asignado automáticamente."
                example="8080"
              />
              <EnvRow
                name="LOG_LEVEL"
                required={false}
                description="Nivel de logs del servidor. Valores: trace, debug, info, warn, error."
                example="info"
              />
            </div>

            <div
              className="mt-3 rounded-xl px-4 py-3 flex gap-3 items-start"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <span className="text-yellow-400 text-base shrink-0">⚠</span>
              <p className="text-[12px] text-yellow-400/70 leading-relaxed">
                Obtén tu API key gratuita en{" "}
                <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-yellow-400 transition-colors">
                  themoviedb.org/settings/api
                </a>
                . El plan gratuito tiene un límite de 100 req/s, más que suficiente para uso personal.
              </p>
            </div>
          </Step>

          <Step number={4} title="Ejecuta en local" icon={<Terminal className="w-4 h-4" />}>
            <p>Lanza el servidor API y el frontend en modo desarrollo:</p>
            <CodeBlock code={`# Terminal 1 — API server
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend web
pnpm --filter @workspace/tmdb-stremio run dev`} />
            <p className="mt-3">
              El frontend estará disponible en <code className="text-indigo-300/80 font-mono text-[12px]">http://localhost:5173</code> y
              el addon de Stremio en <code className="text-indigo-300/80 font-mono text-[12px]">http://localhost:8080/api/stremio/manifest.json</code>.
            </p>
          </Step>

          <Step number={5} title="Despliega en producción" icon={<Rocket className="w-4 h-4" />}>
            <p>Elige la plataforma que prefieras. Las tres opciones siguientes tienen plan gratuito:</p>

            <div className="mt-3 space-y-2.5">
              {deployOptions.map((opt) => (
                <a
                  key={opt.name}
                  href={opt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 rounded-xl px-4 py-3.5 transition-all hover:brightness-110"
                  style={{ background: opt.color, border: `1px solid ${opt.border}` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-display font-bold text-white/85 text-sm">{opt.name}</span>
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: opt.border, color: "rgba(255,255,255,0.6)" }}
                      >
                        {opt.badge}
                      </span>
                      <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors ml-auto shrink-0" />
                    </div>
                    <p className="text-[12px] text-white/40 mb-1">{opt.description}</p>
                    <p className="text-[11px] font-mono text-white/30">{opt.steps}</p>
                  </div>
                </a>
              ))}
            </div>

            <p className="mt-4">
              Para build de producción manual:
            </p>
            <CodeBlock code={`# Build del servidor API
pnpm --filter @workspace/api-server run build

# Build del frontend (genera /dist)
pnpm --filter @workspace/tmdb-stremio run build`} />
          </Step>
        </div>

        {/* Notes */}
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h4 className="text-sm font-display font-semibold text-white/70">Notas adicionales</h4>
          <ul className="space-y-2">
            {[
              "El addon de Stremio funciona en cualquier URL pública — simplemente copia la URL /api/stremio/manifest.json y pégala en Stremio.",
              "Los datos de streaming se obtienen en tiempo real desde TMDB, por lo que siempre estarán actualizados.",
              "MDBList y Trakt no requieren configuración adicional si se usan APIs públicas. Para cuotas mayores, añade tus propias keys.",
              "El proyecto es 100% open source bajo licencia MIT — puedes modificarlo libremente.",
            ].map((note, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[12px] text-white/35 leading-relaxed">
                <span className="text-white/20 shrink-0 mt-0.5">—</span>
                {note}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-center text-white/10 text-[11px] mt-8 tracking-widest uppercase font-medium">
          designed by zzever
        </p>
      </div>
    </div>
  );
}
