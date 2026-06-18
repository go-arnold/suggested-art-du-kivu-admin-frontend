"use client";

import { useState } from "react";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email,      setEmail]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent,       setSent]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("L'email est requis"); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { toast.error("Email invalide"); return; }

    setSubmitting(true);
    try {
      await authApi.resetPassword({ email });
      setSent(true);
    } catch (err: unknown) {
      // Even on error we show success for security (don't reveal if email exists)
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
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
            <h2 className="font-display text-xl font-bold text-foreground">Email envoyé !</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Si un compte existe pour{" "}
              <span className="font-medium text-foreground">{email}</span>,
              vous recevrez un lien de réinitialisation dans quelques minutes.
            </p>
            <p className="text-xs text-muted-foreground">
              Vérifiez aussi votre dossier spam.
            </p>
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-display text-2xl font-bold">
            AK
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
            Art-du-Kivu
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Réinitialiser votre mot de passe
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-2xl bg-card p-6 card-shadow space-y-5">
          <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
            Entrez votre adresse email et nous vous enverrons un lien pour
            réinitialiser votre mot de passe.
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Adresse email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="vous@artdukivu.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={submitting}
                className="pl-9"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Envoyer le lien
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login"
            className="font-medium text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
