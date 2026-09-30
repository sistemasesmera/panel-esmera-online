import type { Metadata } from "next";
import { login } from "./actions";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen w-full flex bg-[#0a0e1a]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0f1729] to-[#1a1040]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/15 rounded-full blur-[100px]" />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-black text-base">E</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Esmera Online</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400">
              Panel de gestión
            </p>
            <h1 className="text-4xl font-black text-white leading-[1.15] tracking-tight">
              Hazte profesional<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                en lo que te apasiona
              </span>
            </h1>
          </div>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Gestiona alumnos, matrículas y el pipeline comercial desde un solo lugar.
          </p>

          {/* Stats */}
          <div className="flex gap-8 pt-2">
            {[
              { value: "100%", label: "Online" },
              { value: "Activo", label: "24/7" },
              { value: "Todo", label: "En un lugar" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-slate-600 text-xs">© 2026 Esmera Online · Todos los derechos reservados</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="absolute inset-0 bg-[#080c17]" />

        <div className="relative z-10 w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-black text-sm">E</span>
            </div>
            <span className="text-white font-bold">Esmera Online</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-white tracking-tight">Bienvenido de nuevo</h2>
            <p className="text-slate-500 text-sm mt-1">Accede a tu panel de gestión</p>
          </div>

          <form action={login} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@email.com"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/50 transition-colors hover:border-white/[0.12]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/50 transition-colors hover:border-white/[0.12]"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
                <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                <p className="text-sm text-red-400">{decodeURIComponent(error)}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full cursor-pointer rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 active:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#080c17] mt-2"
            >
              Acceder al panel
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-8">
            ¿Problemas para acceder? Contacta con{" "}
            <span className="text-slate-500">sistemas@esmeraschool.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}
