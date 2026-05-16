/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { optimizePackageImports: ["@mui/material", "@mui/icons-material"] },
  serverExternalPackages: ["konva", "canvas"],
  images: { remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }] },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "canvas", "konva"];
    }
    return config;
  },
};
export default nextConfig;
