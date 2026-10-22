import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({ server: { entry: "server" } }),
    nitro(),
    viteReact(),
  ],
});
