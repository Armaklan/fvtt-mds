import { defineConfig } from "vite";

export default defineConfig({
  plugins: [],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  root: "src",
  base: "",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "esnext",
    sourcemap: true,
    lib: {
      entry: "index.ts",
      formats: ["es"]
    },
    rollupOptions: {
      output: {
        entryFileNames: "bundle.js"
      }
    }
  }
});
