import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  /* config options here */
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
};

export default withPWA(nextConfig);
