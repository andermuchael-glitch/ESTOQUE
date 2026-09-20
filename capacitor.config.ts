import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.estoque.controle",
  appName: "ESTOQUE",
  webDir: "out",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
  },
};

export default config;
