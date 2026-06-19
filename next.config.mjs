/** @type {import('next').NextConfig} */

// URL du backend hébergé. Surchargeable via la variable d'env BACKEND_API_URL.
const BACKEND_API_URL =
  process.env.BACKEND_API_URL || "https://jeremy-backend.onrender.com/api/v1"

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Le backend Django exige le slash final (ex: /auth/login/). Par défaut Next
  // redirige (308) /login/ -> /login et casse le proxy : on désactive donc la
  // redirection automatique de slash.
  skipTrailingSlashRedirect: true,
  // Proxy same-origin : le navigateur appelle /api/v1/* (même domaine que le
  // front), Next relaie vers le backend côté serveur. Évite tout problème de
  // CORS, en dev comme en production. La 1re règle préserve le slash final.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*/",
        destination: `${BACKEND_API_URL}/:path*/`,
      },
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_API_URL}/:path*`,
      },
    ]
  },
}

export default nextConfig
