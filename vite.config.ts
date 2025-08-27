import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/pokemon-card-binder/",
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
  define: {
    __POKEMON_API_KEY__: JSON.stringify(
      process.env.VITE_POKEMON_TCG_API_KEY || ""
    ),
  },
});
