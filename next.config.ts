import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/presentacion', destination: '/presentacion-agentes-bahia.html' },
      { source: '/comparacion', destination: '/comparacion-sistema-bahia.html' },
      { source: '/guia', destination: '/guia-implementacion.html' },
    ]
  },
};

export default nextConfig;
