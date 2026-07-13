"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Eye, EyeOff, CheckCircle2, XCircle, ArrowLeft, User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GoogleLoginButton } from "@/components/auth/google-login-button";

// ── Password strength ─────────────────────────────────────────────────────────

interface PasswordRule {
  label: string;
  test: (p: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "Au moins 8 caractères",       test: (p) => p.length >= 8 },
  { label: "Une lettre majuscule",         test: (p) => /[A-Z]/.test(p) },
  { label: "Une lettre minuscule",         test: (p) => /[a-z]/.test(p) },
  { label: "Un chiffre",                   test: (p) => /\d/.test(p) },
  { label: "Un caractère spécial (!@#…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function score(p: string) {
  return PASSWORD_RULES.filter((r) => r.test(p)).length;
}

function StrengthBar({ value }: { value: number }) {
  const config = [
    { min: 5, label: "Excellent", bar: "bg-success",     text: "text-success" },
    { min: 4, label: "Bon",       bar: "bg-info",        text: "text-info" },
    { min: 3, label: "Moyen",     bar: "bg-warning",     text: "text-warning" },
    { min: 1, label: "Faible",    bar: "bg-destructive", text: "text-destructive" },
    { min: 0, label: "",          bar: "bg-muted",       text: "" },
  ];
  const level = config.find((c) => value >= c.min)!;

  return (
    <div className="space-y-1.5 mt-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-300", level.bar)}
          style={{ width: `${(value / PASSWORD_RULES.length) * 100}%` }}
        />
      </div>
      {level.label && (
        <p className={cn("text-xs font-medium", level.text)}>{level.label}</p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [firstName,  setFirstName]  = useState("");
  const [lastName,   setLastName]   = useState("");
  const [username,   setUsername]   = useState("");
  const [email,      setEmail]      = useState("");
  const [password1,  setPassword1]  = useState("");
  const [password2,  setPassword2]  = useState("");
  const [showPwd1,   setShowPwd1]   = useState(false);
  const [showPwd2,   setShowPwd2]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const strength = score(password1);
  const match    = password1.length > 0 && password1 === password2;
  const noMatch  = password2.length > 0 && password1 !== password2;

  // Auto-generate username from first + last name
  useEffect(() => {
    if (firstName || lastName) {
      const generated = `${firstName}${lastName}`
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9_]/g, "");
      setUsername(generated);
    }
  }, [firstName, lastName]);

  // Already logged in → redirect
  useEffect(() => {
    if (!authLoading && user) router.replace("/admin");
  }, [authLoading, user, router]);

  const validate = () => {
    if (!firstName.trim()) { toast.error("Le prénom est requis");   return false; }
    if (!lastName.trim())  { toast.error("Le nom est requis");      return false; }
    if (!username.trim())  { toast.error("Le nom d'utilisateur est requis"); return false; }
    if (!/^[a-zA-Z0-9_]{3,}$/.test(username)) {
      toast.error("Le nom d'utilisateur doit contenir au moins 3 caractères (lettres, chiffres, _)");
      return false;
    }
    if (!email.trim())     { toast.error("L'email est requis");     return false; }
    if (!/\S+@\S+\.\S+/.test(email)) { toast.error("Email invalide"); return false; }
    if (strength < 3)      { toast.error("Mot de passe trop faible"); return false; }
    if (!match)            { toast.error("Les mots de passe ne correspondent pas"); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await authApi.register({
        username: username.trim(),
        email: email.trim(),
        password1,
        password2,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      // Le backend renvoie { detail: "Un email de vérification a été envoyé." }
      setSuccessMsg(res?.detail ?? "");
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";

      // Le backend retourne 500 quand l'email de confirmation ne peut pas être envoyé,
      // mais le compte est généralement créé.
      if (msg.includes("server_error") || msg.includes("500") || msg.includes("unexpected")) {
        setSuccess(true);
        toast.info("Compte créé, mais l'email de vérification n'a pas pu être envoyé.");
      } else {
        toast.error(msg || "Erreur lors de la création du compte");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Auth loading ──
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Success screen ──
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center space-y-6">
          {/* Logo */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-display text-2xl font-bold">
            AK
          </div>

          <div className="rounded-2xl bg-card p-8 card-shadow space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Compte créé !
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {successMsg || "Un email de vérification a été envoyé."}
              <br /><br />
              Vérifiez la boîte de réception de{" "}
              <span className="font-medium text-foreground">{email}</span>{" "}
              et cliquez sur le lien de confirmation pour activer le compte{" "}
              <span className="font-medium text-foreground">@{username}</span>,
              puis connectez-vous.
            </p>

            {/* Timeline */}
            <div className="rounded-xl bg-muted/50 p-4 text-left space-y-3">
              {[
                { step: "1", text: "Compte créé", done: true },
                { step: "2", text: "Vérifier votre email", done: false },
                { step: "3", text: "Se connecter", done: false },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    item.done
                      ? "bg-success text-white"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  )}>
                    {item.done ? <CheckCircle2 className="h-4 w-4" /> : item.step}
                  </div>
                  <span className={cn("text-sm", item.done ? "text-foreground font-medium" : "text-muted-foreground")}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>

            <Button asChild className="w-full">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à la connexion
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Register form ──
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 py-10">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-display text-2xl font-bold">
            AK
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
            Art-du-Kivu
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Créer un compte administrateur
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-card p-6 card-shadow space-y-4"
          noValidate
        >
          {/* First name / Last name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                placeholder="Jean"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                placeholder="Matabaro"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username">
              Nom d'utilisateur
              <span className="ml-1 text-xs text-muted-foreground">(généré automatiquement)</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                placeholder="jeanmatabaro"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                autoComplete="username"
                disabled={submitting}
                className="pl-9"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Lettres, chiffres et underscore uniquement. Min. 3 caractères.
            </p>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Adresse email</Label>
            <Input
              id="email"
              type="email"
              placeholder="jean@artdukivu.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={submitting}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password1">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password1"
                type={showPwd1 ? "text" : "password"}
                placeholder="••••••••"
                value={password1}
                onChange={(e) => setPassword1(e.target.value)}
                autoComplete="new-password"
                disabled={submitting}
                className="pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd1((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPwd1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {password1 && (
              <>
                <StrengthBar value={strength} />
                <ul className="mt-1.5 space-y-1">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(password1);
                    return (
                      <li
                        key={rule.label}
                        className={cn(
                          "flex items-center gap-1.5 text-xs",
                          ok ? "text-success" : "text-muted-foreground"
                        )}
                      >
                        {ok
                          ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          : <XCircle      className="h-3.5 w-3.5 shrink-0" />}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="password2">Confirmer le mot de passe</Label>
            <div className="relative">
              <Input
                id="password2"
                type={showPwd2 ? "text" : "password"}
                placeholder="••••••••"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                disabled={submitting}
                className={cn(
                  "pr-10",
                  noMatch && "border-destructive focus-visible:ring-destructive",
                  match   && "border-success  focus-visible:ring-success"
                )}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd2((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPwd2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {noMatch && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <XCircle className="h-3.5 w-3.5" />
                Les mots de passe ne correspondent pas
              </p>
            )}
            {match && (
              <p className="flex items-center gap-1 text-xs text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Les mots de passe correspondent
              </p>
            )}
          </div>

          {/* Notice */}
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
            📧 Un email de vérification vous sera envoyé. Confirmez votre adresse
            avant de pouvoir vous connecter.
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || (password1.length > 0 && strength < 3) || noMatch}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer mon compte
          </Button>

          {/* Séparateur + inscription/connexion Google */}
          <div className="relative">
            <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
            <span className="relative mx-auto block w-fit bg-card px-2 text-xs text-muted-foreground">
              ou
            </span>
          </div>

          <GoogleLoginButton disabled={submitting} label="S'inscrire avec Google" />
        </form>

        {/* Login link */}
        <p className="text-center text-sm text-muted-foreground">
          Vous avez déjà un compte ?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
