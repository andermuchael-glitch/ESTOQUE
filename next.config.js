/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: "/ESTOQUE",
  assetPrefix: "/ESTOQUE/",
  images: { unoptimized: true },
};

module.exports = nextConfig;
