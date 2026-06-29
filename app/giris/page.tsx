"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Scale, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function GirisPage() {
  const router = useRouter();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [form, setForm] = useState({ email: "", sifre: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setYukleniyor(true);

    const sonuc = await signIn("credentials", {
      email: form.email,
      sifre: form.sifre,
      redirect: false,
    });

    setYukleniyor(false);

    if (sonuc?.error) {
      toast.error("E-posta veya şifre hatalı.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <style>{`
        @keyframes float-1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(30px, -40px) rotate(120deg) scale(1.05); }
          66% { transform: translate(-20px, 20px) rotate(240deg) scale(0.95); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(-40px, 30px) rotate(-90deg) scale(1.08); }
          66% { transform: translate(25px, -35px) rotate(-180deg) scale(0.92); }
        }
        @keyframes float-3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(20px, 30px) rotate(180deg); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.7; }
          50% { transform: scale(1.05); opacity: 0.3; }
          100% { transform: scale(0.95); opacity: 0.7; }
        }
        .orb-1 { animation: float-1 18s ease-in-out infinite; }
        .orb-2 { animation: float-2 24s ease-in-out infinite; }
        .orb-3 { animation: float-3 14s ease-in-out infinite; }
        .card-enter { animation: fade-in-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .icon-ring { animation: pulse-ring 3s ease-in-out infinite; }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px rgba(255,255,255,0.08) inset;
          -webkit-text-fill-color: #e2e8f0;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      <div
        className="min-h-screen flex items-center justify-center px-4 overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a2744 50%, #0f172a 100%)" }}
      >
        {/* Animated orbs */}
        <div className="orb-1 absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }} />
        <div className="orb-2 absolute bottom-[-15%] right-[-5%] w-[600px] h-[600px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }} />
        <div className="orb-3 absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)" }} />

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px"
          }} />

        {/* Login card */}
        <div
          className="card-enter relative w-full max-w-sm rounded-2xl p-8"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)"
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="icon-ring absolute inset-0 rounded-full"
                style={{ background: "rgba(99, 102, 241, 0.3)", margin: "-6px" }} />
              <div className="relative flex items-center justify-center w-14 h-14 rounded-full"
                style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}>
                <Scale className="h-7 w-7 text-white" />
              </div>
            </div>
            <h1 className="text-xl font-semibold text-white tracking-wide">Hukuk Bürosu</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider" htmlFor="email">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                placeholder="avukat@buro.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                disabled={yukleniyor}
                className="w-full px-4 py-2.5 rounded-lg text-sm text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 disabled:opacity-50"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onFocus={(e) => {
                  e.target.style.border = "1px solid rgba(99,102,241,0.6)";
                  e.target.style.background = "rgba(255,255,255,0.09)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)";
                }}
                onBlur={(e) => {
                  e.target.style.border = "1px solid rgba(255,255,255,0.1)";
                  e.target.style.background = "rgba(255,255,255,0.06)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider" htmlFor="sifre">
                Şifre
              </label>
              <input
                id="sifre"
                type="password"
                placeholder="••••••••"
                value={form.sifre}
                onChange={(e) => setForm({ ...form, sifre: e.target.value })}
                required
                disabled={yukleniyor}
                className="w-full px-4 py-2.5 rounded-lg text-sm text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 disabled:opacity-50"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onFocus={(e) => {
                  e.target.style.border = "1px solid rgba(99,102,241,0.6)";
                  e.target.style.background = "rgba(255,255,255,0.09)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)";
                }}
                onBlur={(e) => {
                  e.target.style.border = "1px solid rgba(255,255,255,0.1)";
                  e.target.style.background = "rgba(255,255,255,0.06)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <button
              type="submit"
              disabled={yukleniyor}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 mt-2"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                boxShadow: "0 4px 15px rgba(99,102,241,0.4)"
              }}
              onMouseEnter={(e) => {
                if (!yukleniyor) {
                  (e.target as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(99,102,241,0.6)";
                  (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.boxShadow = "0 4px 15px rgba(99,102,241,0.4)";
                (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              {yukleniyor ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Giriş yapılıyor...
                </span>
              ) : (
                "Giriş Yap"
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
