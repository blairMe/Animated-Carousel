import type { NextConfig } from "next";

// Next.js is only the local playground for the carousel.
// The component itself (components/AnimatedCarousel.tsx) has no Next.js imports.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
