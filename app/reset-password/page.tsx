"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const RULES = [
  { label: "Au moins 8 caractères",       test: (p: string) => p.length >= 8 },
  { label: "Une lettre majuscule",         test: (p: string) => /[A-Z]/.test(p) },
  { label: "Une lettre minuscule",         test: (p: string) => /[a-z]/.test(p) },
  { label: "Un chiffre",                   test: (p: string) => /\d/.test(p) },
  { label: "Un caractère spécial (!@#…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function ResetForm() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const uid   = searchParams.get("uid")   ?? "";
  const token = searchParams.get("token") ?? "";

  const [password1,  setPassword1]  = useState("");
  const [password2,  setPassword2]  = useState("");
  const [showPwd1,   setShowPwd1]   = useState(false);
  const [showPwd2,   setShowPwd2]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);

  const strength = RULES.filter((r) => r.test(password1)).length;
  const match    = password1.length > 0 && password1 === password2;
  const noMatch  = password2.length > 0 && password1 !== password2;

  const strengthConfig = [
    { min: 5, label: "Excellent", bar: "bg-success",     text: "text-success",     pct: 100 },
    { min: 4, label: "Bon",       bar: "bg-info",        text: "text-info",        pct: 80  },
    { min: 3, label: "Moyen",     bar: "bg-warning",     text: "text-warning",     pct: 60  },
    { min: 1, label: "Faible",    bar: "bg-destructive", text: "text-destructive", pct: (strength / 5) * 100 },
    { min: 0, label: "",          bar: "bg-muted",       text: "",                 pct: 0   },
  ];
  const level = strengthConfig.find((c) => strength >= c.min)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !token) { toast.error("Lien invalide ou expiré"); return; }
    if (strength < 3)   { toast.error("Mot de passe trop faible"); return; }
    if (!match)         { toast.error("Les mots de passe ne correspondent pas"); return; }

    setSubmitting(true);
    try {
      await authApi.resetPasswordConfirm({ uid, token, new_password1: password1, new_password2: password2 });
      setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("server_error") || msg.includes("500")) {
        toast.error("Le service email est indisponible. Contactez l'administrateur.");
      } else {
        toast.error(msg || "Lien expiré ou invalide. Demandez un nouveau lien.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!uid || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm rounded-2xl bg-card p-8 card-shadow text-center space-y-4">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="font-display text-xl font-bold">Lien invalide</h2>
          <p className="text-sm text-muted-foreground">
            Ce lien de réinitialisation est invalide ou a expiré.
          </p>
          <Button asChild className="w-full">
            <Link href="/forgot-password">Demander un nouveau lien</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-display text-2xl font-bold">
            AK
          </div>
          <div className="rounded-2xl bg-card p-8 card-shadow space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="font-display text-xl font-bold">Mot de passe réinitialisé !</h2>
            <p className="text-sm text-muted-foreground">
              Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Se connecter</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-display text-2xl font-bold">
            AK
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Art-du-Kivu</h1>
          <p className="mt-1 text-sm text-muted-foreground">Nouveau mot de passe</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-card p-6 card-shadow space-y-5">
          {/* Password 1 */}
          <div className="space-y-2">
            <Label htmlFor="pwd1">Nouveau mot de passe</Label>
            <div className="relative">
              <Input id="pwd1" type={showPwd1 ? "text" : "password"} placeholder="••••••••"
                value={password1} onChange={(e) => setPassword1(e.target.value)}
                autoComplete="new-password" disabled={submitting} className="pr-10" />
              <button type="button" tabIndex={-1} onClick={() => setShowPwd1((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwd1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {password1 && (
              <>
                <div className="space-y-1.5 mt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full transition-all duration-300", level.bar)}
                      style={{ width: `${level.pct}%` }} />
                  </div>
                  {level.label && <p className={cn("text-xs font-medium", level.text)}>{level.label}</p>}
                </div>
                <ul className="mt-1.5 space-y-1">
                  {RULES.map((rule) => {
                    const ok = rule.test(password1);
                    return (
                      <li key={rule.label} className={cn("flex items-center gap-1.5 text-xs", ok ? "text-success" : "text-muted-foreground")}>
                        {ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          {/* Password 2 */}
          <div className="space-y-2">
            <Label htmlFor="pwd2">Confirmer le mot de passe</Label>
            <div className="relative">
              <Input id="pwd2" type={showPwd2 ? "text" : "password"} placeholder="••••••••"
                value={password2} onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password" disabled={submitting}
                className={cn("pr-10",
                  noMatch && "border-destructive focus-visible:ring-destructive",
                  match   && "border-success  focus-visible:ring-success"
                )} />
              <button type="button" tabIndex={-1} onClick={() => setShowPwd2((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwd2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {noMatch && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <XCircle className="h-3.5 w-3.5" />Les mots de passe ne correspondent pas
              </p>
            )}
            {match && (
              <p className="flex items-center gap-1 text-xs text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />Les mots de passe correspondent
              </p>
            )}
          </div>

          <Button type="submit" className="w-full"
            disabled={submitting || strength < 3 || !match}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Réinitialiser le mot de passe
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ResetForm />
    </Suspense>
  );
}
