import React, { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Copy, Check, Server, Github, Terminal, Key, Rocket, Package, ExternalLink, Plug } from "lucide-react";

const REPO_URL = "https://github.com/zzever/tmdb-streaming-services";

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
          <span className="text-white/50">{icon}</span>
        </div>
        <div className="w-px flex-1 mt-2" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>

      <div className="pb-8 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2 mt-1.5">
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest tabular-nums">Paso {number}</span>
        </div>
        <h3 className="text-base font-display font-semibold text-white/80 mb-3">{title}</h3>
        <div className="text-sm text-white/40 leading-relaxed space-y-2">{children}</div>
      </div>
    </div>
  );
}

const ENV_VARS = [
  { name: "TMDB_API_KEY", required: true, description: "API key de The Movie Database (TMDB). Gratis en developer.themoviedb.org" },
  { name: "PORT", required: false, description: "Puerto del servidor API. Defecto: 3001" },
  { name: "NODE_ENV", required: false, description: "Entorno: production o development" },
];

const HOSTING_OPTIONS = [
  {
    name: "Railway",
    url: "https://railway.app",
    badge: "Recomendado",
    badgeColor: "rgba(99,102,241,0.15)",
    badgeTextColor: "rgba(165,180,252,0.9)",
    badgeBorderColor: "rgba(99,102,241,0.3)",
    description: "Deploy con un clic directamente desde GitHub. Soporta monorepos. Plan gratuito incluido.",
  },
  {
    name: "Render",
    url: "https://render.com",
    badge: "Gratis",
    badgeColor: "rgba(16,185,129,0.1)",
    badgeTextColor: "rgba(110,231,183,0.9)",
    badgeBorderColor: "rgba(16,185,129,0.22)",
    description: "Servicios web gratuitos con auto-deploy desde GitHub. Ideal para proyectos personales.",
  },
  {
    name: "Fly.io",
    url: "https://fly.io",
    badge: "Pro",
    badgeColor: "rgba(245,158,11,0.1)",
    badgeTextColor: "rgba(252,211,77,0.9)",
    badgeBorderColor: "rgba(245,158,11,0.22)",
    description: "Despliegue global con baja latencia. Excelente para apps de producción de alto tráfico.",
  },
];

export default function SelfHost() {
  return (
    <div className="min-h-screen relative" style={{ background: "#080912" }}>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

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
            <span className="gradient-text">Despliégalo</span>
            <span className="text-white/80"> tú mismo</span>
          </h1>
          <p className="text-white/35 text-sm leading-relaxed max-w-xl">
            TMDB Streaming ES es open source. Puedes alojarlo en tu propio servidor, con tu propia
            API key de TMDB, sin depender de ningún servicio externo.
          </p>
        </div>

        {/* Stremio addon banner */}
        <div
          className="rounded-2xl p-4 mb-8 flex items-center gap-3"
          style={{ background: "rgba(229,9,20,0.07)", border: "1px solid rgba(229,9,20,0.18)" }}
        >
          <Plug className="w-4 h-4 text-primary/70 shrink-0" />
          <p className="text-sm text-white/55">
            Al desplegarlo, también tendrás tu propio addon de Stremio en{" "}
            <code className="text-primary/70 font-mono text-xs">https://tu-dominio/api/stremio/manifest.json</code>
          </p>
        </div>

        {/* Steps */}
        <div>
          <Step number={1} title="Clona el repositorio de GitHub" icon={<Github className="w-4 h-4" />}>
            <p>Haz fork del proyecto en GitHub o clónalo directamente en tu máquina:</p>
            <div className="flex items-center gap-2 mt-2 mb-1">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/70 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <Github className="w-3.5 h-3.5" />
                Ver en GitHub
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </div>
            <CodeBlock code={`git clone https://github.com/zzever/tmdb-streaming-services.git
cd tmdb-streaming-services`} />
          </Step>

          <Step number={2} title="Instala las dependencias" icon={<Package className="w-4 h-4" />}>
            <p>El proyecto usa <strong className="text-white/65">pnpm</strong> como gestor de paquetes en un monorepo. Si no lo tienes instalado:</p>
            <CodeBlock code={`npm install -g pnpm
pnpm install`} />
          </Step>

          <Step number={3} title="Configura las variables de entorno" icon={<Key className="w-4 h-4" />}>
            <p>Copia el archivo de ejemplo y añade tu API key de TMDB:</p>
            <CodeBlock code={`cp .env.example .env`} />
            <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wider text-[10px]">Variable</th>
                    <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wider text-[10px]">Requerida</th>
                    <th className="text-left px-4 py-2.5 text-white/30 font-semibold uppercase tracking-wider text-[10px]">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {ENV_VARS.map((v, i) => (
                    <tr
                      key={v.name}
                      style={{
                        background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                        borderBottom: i < ENV_VARS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      }}
                    >
                      <td className="px-4 py-2.5">
                        <code className="text-primary/60 font-mono">{v.name}</code>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            v.required
                              ? "text-red-400/80 bg-red-400/10"
                              : "text-white/30 bg-white/5"
                          }`}
                        >
                          {v.required ? "Sí" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-white/35">{v.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2">
              Consigue tu API key gratuita en{" "}
              <a href="https://developer.themoviedb.org" target="_blank" rel="noopener noreferrer"
                className="text-primary/60 hover:text-primary transition-colors">
                developer.themoviedb.org
              </a>
            </p>
          </Step>

          <Step number={4} title="Inicia en local" icon={<Terminal className="w-4 h-4" />}>
            <p>Arranca el servidor API y el cliente web en modo desarrollo:</p>
            <CodeBlock code={`pnpm dev`} />
            <p>El servidor API estará en <code className="text-primary/60 font-mono text-xs">localhost:3001</code> y el cliente en <code className="text-primary/60 font-mono text-xs">localhost:5173</code></p>
          </Step>

          <Step number={5} title="Despliega en producción" icon={<Rocket className="w-4 h-4" />}>
            <p>Para un build optimizado listo para producción:</p>
            <CodeBlock code={`pnpm build
pnpm start`} />
            <p>Plataformas de hosting recomendadas:</p>
            <div className="mt-3 space-y-2.5">
              {HOSTING_OPTIONS.map((opt) => (
                <a
                  key={opt.name}
                  href={opt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-all hover:bg-white/[0.03]"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-white/80 text-sm group-hover:text-white transition-colors">
                        {opt.name}
                      </span>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                        style={{
                          background: opt.badgeColor,
                          color: opt.badgeTextColor,
                          border: `1px solid ${opt.badgeBorderColor}`,
                        }}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-xs text-white/30">{opt.description}</p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
                </a>
              ))}
            </div>
          </Step>
        </div>

        {/* Stremio addon section */}
        <div
          className="rounded-2xl p-5 mt-2 mb-8"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Plug className="w-4 h-4 text-primary/60" />
            <h3 className="text-sm font-semibold text-white/70">Addon de Stremio incluido</h3>
          </div>
          <p className="text-xs text-white/35 leading-relaxed mb-3">
            Al desplegar el proyecto, el addon de Stremio está disponible automáticamente en{" "}
            <code className="text-primary/60 font-mono">/api/stremio/manifest.json</code>.
            Para instalarlo, añade esta URL en Stremio:
          </p>
          <CodeBlock code={`https://tu-dominio.com/api/stremio/manifest.json`} />
          <p className="text-xs text-white/25 mt-2">
            En Stremio: <span className="text-white/40">Addons → Addon del repositorio → Pegar URL del manifest</span>
          </p>
        </div>

        <div
          className="rounded-2xl p-5 flex items-start gap-3"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Github className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
          <p className="text-[12px] text-white/30 leading-relaxed">
            ¿Encontraste un bug o quieres proponer una mejora?{" "}
            <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer"
              className="text-primary/60 hover:text-primary transition-colors underline underline-offset-2">
              Abre un issue en GitHub
            </a>
            {" "}o manda un pull request. Las contribuciones son bienvenidas.
          </p>
        </div>

        <p className="text-center text-white/10 text-[11px] mt-8 tracking-widest uppercase font-medium">
          designed by zzever
        </p>
      </div>
    </div>
  );
}
