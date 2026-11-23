import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async redirects() {
    return [{ source: "/register", destination: "/login", permanent: false }]
  },
};

export default nextConfig;
