/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },
  // Lean, self-contained build output — used by the Dockerfile's runtime
  // stage for self-hosting. Vercel ignores this and uses its own build
  // pipeline, so it's safe to leave on for both deploy paths.
  output: "standalone",
};
module.exports = nextConfig;
