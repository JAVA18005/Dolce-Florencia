import type { NextConfig } from "next";

// Host de Supabase Storage para que next/image pueda servir objetos del bucket
// "productos" (Fase 6). Se deriva de SUPABASE_URL en build time.
const supabaseHost = process.env.SUPABASE_URL
  ? new URL(process.env.SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;