import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '127.0.0.1:3000',
        '*.ngrok-free.app',
        '*.ngrok.io',
        '*.trycloudflare.com',
        '*.localtunnel.me',
        '*.gitpod.io'
      ],
    },
  },
  compress: true,

  // Service Worker headers configuration
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
      {
        source: "/serwist/:path*",
        headers: [
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },

  // Rewrite /sw.js to statically compiled route in /serwist/sw.js
  async rewrites() {
    return [
      {
        source: "/sw.js",
        destination: "/serwist/sw.js",
      },
      {
        source: "/sw.js.map",
        destination: "/serwist/sw.js.map",
      },
      {
        source: "/:slug(workbox-.*)",
        destination: "/serwist/:slug",
      },
    ];
  },
};

export default withSerwist(nextConfig);
