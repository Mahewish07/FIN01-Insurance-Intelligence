import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf"],
  experimental: {
    serverActions: { bodySizeLimit: "16mb" },
  },
};

export default nextConfig;
