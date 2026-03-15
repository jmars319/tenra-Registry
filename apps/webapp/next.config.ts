import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@registry/api-contracts",
    "@registry/auth",
    "@registry/config",
    "@registry/domain",
    "@registry/ui",
    "@registry/validation"
  ],
  turbopack: {
    root: path.resolve(__dirname, "../../")
  }
};

export default nextConfig;
