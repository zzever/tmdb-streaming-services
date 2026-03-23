import React from "react";
import { Link } from "wouter";
import { ArrowLeft, ExternalLink, Heart, Code2 } from "lucide-react";

interface Library {
  name: string;
  description: string;
  url: string;
  license: string;
  category: string;
}

const libraries: Library[] = [
  {
    name: "React",
    description: "Librería para construir interfaces de usuario con componentes reutilizables.",
    url: "https://github.com/facebook/react",
    license: "MIT",
    category: "Frontend",
  },
  {
    name: "Vite",
    description: "Herramienta de build ultrarrápida para proyectos web modernos.",
    url: "https://github.com/vitejs/vite",
    license: "MIT",
    category: "Frontend",
  },
  {
    name: "TypeScript",
    description: "Superset tipado de JavaScript que mejora la robustez del código.",
    url: "https://github.com/microsoft/TypeScript",
    license: "Apache-2.0",
    category: "Frontend",
  },
  {
    name: "Tailwind CSS",
    description: "Framework CSS de utilidades para diseño rápido y consistente.",
    url: "https://github.com/tailwindlabs/tailwindcss",
    license: "MIT",
    category: "Frontend",
  },
  {
    name: "Framer Motion",
    description: "Librería de animaciones declarativas para React con física realista.",
    url: "https://github.com/framer/motion",
    license: "MIT",
    category: "Frontend",
  },
  {
    name: "TanStack Query",
    description: "Gestión de estado asíncrono y caché de datos del servidor.",
    url: "https://github.com/TanStack/query",
    license: "MIT",
    category: "Frontend",
  },
  {
    name: "Wouter",
    description: "Enrutador minimalista para React, alternativa ligera a React Router.",
    url: "https://github.com/molefrog/wouter",
    license: "ISC",
    category: "Frontend",
  },
  {
    name: "Radix UI",
    description: "Componentes primitivos accesibles y sin estilos para React.",
    url: "https://github.com/radix-ui/primitives",
    license: "MIT",
    category: "Frontend",
  },
  {
    name: "Lucide React",
    description: "Colección de más de 1000 iconos SVG limpios y consistentes.",
    url: "https://github.com/lucide-icons/lucide",
    license: "ISC",
    category: "Frontend",
  },
  {
    name: "Fastify",
    description: "Framework web Node.js de alto rendimiento para el servidor API.",
    url: "https://github.com/fastify/fastify",
    license: "MIT",
    category: "Backend",
  },
  {
    name: "Zod",
    description: "Validación de esquemas TypeScript-first con inferencia de tipos.",
    url: "https://github.com/colinhacks/zod",
    license: "MIT",
    category: "Backend",
  },
  {
    name: "Axios",
    description: "Cliente HTTP basado en promesas para Node.js y el navegador.",
    url: "https://github.com/axios/axios",
    license: "MIT",
    category: "Backend",
  },
  {
    name: "Pino",
    description: "Logger ultra rápido para Node.js con formato JSON estructurado.",
    url: "https://github.com/pinojs/pino",
    license: "MIT",
    category: "Backend",
  },
  {
    name: "TMDB API",
    description: "Base de datos de películas y series con metadata, imágenes y proveedores de streaming.",
    url: "https://developer.themoviedb.org",
    license: "CC BY-NC 4.0",
    category: "APIs",
  },
  {
    name: "Stremio Addon SDK",
    description: "SDK oficial para crear addons de Stremio compatibles con el protocolo.",
    url: "https://github.com/Stremio/stremio-addon-sdk",
    license: "MIT",
    category: "APIs",
  },
  {
    name: "MDBList API",
    description: "API para acceder a listas de películas y series curadas por la comunidad.",
    url: "https://mdblist.com",
    license: "Freeware",
    category: "APIs",
  },
  {
    name: "Trakt API",
    description: "Plataforma social para seguimiento de películas y series con listas públicas.",
    url: "https://trakt.tv/b/api-docs",
    license: "Freeware",
    category: "APIs",
  },
];

const categories = ["Frontend", "Backend", "APIs"];

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  Frontend: { bg: "rgba(99,102,241,0.12)", text: "rgba(165,180,252,0.9)", border: "rgba(99,102,241,0.25)" },
  Backend:  { bg: "rgba(16,185,129,0.1)",  text: "rgba(110,231,183,0.9)", border: "rgba(16,185,129,0.22)" },
  APIs:     { bg: "rgba(245,158,11,0.1)",   text: "rgba(252,211,77,0.9)",  border: "rgba(245,158,11,0.22)"  },
};

export default function OpenSource() {
  return (
    <div className="min-h-screen relative" style={{ background: "#080912" }}>
      {/* Ambient orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Back button */}
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
              <Code2 className="w-4.5 h-4.5 text-white/60" />
            </div>
            <span className="text-xs uppercase tracking-widest text-white/30 font-semibold">Código abierto</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold mb-3">
            <span className="gradient-text">Librerías</span>
            <span className="text-white/80"> de código abierto</span>
          </h1>
          <p className="text-white/35 text-sm leading-relaxed max-w-xl">
            Este proyecto se construye sobre el trabajo de la comunidad open source. Gracias a todos los autores
            y mantenedores de estas librerías y APIs.
          </p>
        </div>

        {/* Library sections by category */}
        {categories.map((cat) => (
          <div key={cat} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg uppercase tracking-widest"
                style={{
                  background: categoryColors[cat].bg,
                  color: categoryColors[cat].text,
                  border: `1px solid ${categoryColors[cat].border}`,
                }}
              >
                {cat}
              </span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
            </div>

            <div className="grid gap-2.5">
              {libraries.filter((l) => l.category === cat).map((lib) => (
                <a
                  key={lib.name}
                  href={lib.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start justify-between gap-4 rounded-2xl px-4 py-3.5 transition-all duration-200 hover:bg-white/[0.04]"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-display font-semibold text-white/85 text-sm group-hover:text-white transition-colors">
                        {lib.name}
                      </span>
                      <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
                    </div>
                    <p className="text-[12px] text-white/35 leading-relaxed">{lib.description}</p>
                  </div>
                  <span
                    className="shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md mt-0.5"
                    style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    {lib.license}
                  </span>
                </a>
              ))}
            </div>
          </div>
        ))}

        {/* Footer note */}
        <div
          className="mt-4 rounded-2xl p-5 flex items-start gap-3"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Heart className="w-4 h-4 text-primary/60 shrink-0 mt-0.5" />
          <p className="text-[12px] text-white/30 leading-relaxed">
            TMDB Streaming ES es un proyecto personal de código abierto que utiliza la API de TMDB.
            Este producto usa la API de TMDB pero no está respaldado ni certificado por TMDB.
            Todos los datos de películas y series pertenecen a sus respectivos propietarios.
          </p>
        </div>

        <p className="text-center text-white/10 text-[11px] mt-8 tracking-widest uppercase font-medium">
          designed by zzever
        </p>
      </div>
    </div>
  );
}
