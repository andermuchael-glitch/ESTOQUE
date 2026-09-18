const withSerwistInit = require("@serwist/next").default;

/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: "/ESTOQUE",
  assetPrefix: "/ESTOQUE/",
  images: { unoptimized: true },
};

const withSerwist = withSerwistInit({
  disable: process.env.NODE_ENV === "development",
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  swUrl: "/sw.js",
  scope: "/ESTOQUE/",
  register: false,
  cacheOnNavigation: true,
  reloadOnOnline: false,
  additionalPrecacheEntries: [
    {
      url: "/ESTOQUE/",
      revision: process.env.GITHUB_SHA || "local-build",
    },
  ],
});

module.exports = withSerwist(nextConfig);
