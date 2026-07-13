"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// Minimal typing pour Google Identity Services (chargé via script externe).
type TokenResponse = { access_token?: string; error?: string };
type TokenClient = { requestAccessToken: () => void };

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

interface GoogleLoginButtonProps {
  /** Désactive le bouton (ex: pendant une autre soumission). */
  disabled?: boolean;
  label?: string;
}

export function GoogleLoginButton({
  disabled,
  label = "Continuer avec Google",
}: GoogleLoginButtonProps) {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const tokenClient = useRef<TokenClient | null>(null);

  useEffect(() => {
    if (!CLIENT_ID) return;

    const init = () => {
      const oauth2 = window.google?.accounts?.oauth2;
      if (!oauth2) return;
      tokenClient.current = oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: "openid email profile",
        callback: async (resp) => {
          if (resp.error || !resp.access_token) {
            setLoading(false);
            if (resp.error) toast.error("Connexion Google annulée");
            return;
          }
          try {
            await loginWithGoogle(resp.access_token);
            router.replace("/admin");
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Échec de la connexion Google"
            );
          } finally {
            setLoading(false);
          }
        },
      });
      setReady(true);
    };

    // Charge le script GIS une seule fois.
    const existing = document.getElementById("google-gsi-script");
    if (existing) {
      init();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = "google-gsi-script";
    script.onload = init;
    document.body.appendChild(script);
  }, [loginWithGoogle, router]);

  const handleClick = useCallback(() => {
    if (!CLIENT_ID) {
      toast.error(
        "Connexion Google non configurée — il manque NEXT_PUBLIC_GOOGLE_CLIENT_ID"
      );
      return;
    }
    if (!tokenClient.current) return;
    setLoading(true);
    tokenClient.current.requestAccessToken();
  }, []);

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleClick}
      // Désactivé seulement pendant le chargement / la soumission, ou pendant
      // l'init du script GIS quand un Client ID est défini.
      disabled={disabled || loading || (!!CLIENT_ID && !ready)}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <span className="mr-2">
          <GoogleIcon />
        </span>
      )}
      {label}
    </Button>
  );
}
