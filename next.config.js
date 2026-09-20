const withSerwistInit = require("@serwist/next").default;

/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.CAPACITOR_BUILD === "true" ? "" : "/ESTOQUE",
  assetPrefix: process.env.CAPACITOR_BUILD === "true" ? "" : "/ESTOQUE/",
  images: { unoptimized: true },
};

const withSerwist = withSerwistInit({
  disable: process.env.NODE_ENV === "development",
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  swUrl: "/sw.js",
  scope: process.env.CAPACITOR_BUILD === "true" ? "/" : "/ESTOQUE/",
  register: false,
  cacheOnNavigation: true,
  reloadOnOnline: false,
  additionalPrecacheEntries: process.env.CAPACITOR_BUILD === "true" ? [] : [
    {
      url: "/ESTOQUE/",
      revision: process.env.GITHUB_SHA || "local-build",
    },
  ],
});

module.exports = withSerwist(nextConfig);
