import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone Output für Docker/AWS ECS deployment
  // Für Vercel: irrelevant (wird ignoriert)
  // Für AWS: ermöglicht minimalen Docker-Build
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,

  // Sicherheits-Header
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
