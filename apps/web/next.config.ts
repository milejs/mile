import { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // async redirects() {
  //   return [
  //     {
  //       source: "/_next/static/chunks/app/mile/%5B%5B...milePath%5D%5D/:path*",
  //       destination: "/_next/static/chunks/app/mile/[[...milePath]]/:path*",
  //       permanent: true,
  //     },
  //     {
  //       source: "/_next/static/css/app/mile/%5B%5B...milePath%5D%5D/:path*",
  //       destination: "/_next/static/css/app/mile/[[...milePath]]/:path*",
  //       permanent: true,
  //     },
  //   ];
  // },
  // transpilePackages: ["@milejs/core"]
};

export default nextConfig;
