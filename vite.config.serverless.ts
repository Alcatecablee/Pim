import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serverless function build configuration for Vercel
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "server/serverless.ts"),
      name: "serverless",
      fileName: "index",
      formats: ["cjs"],
    },
    outDir: "dist/serverless",
    target: "node22",
    ssr: true,
    rollupOptions: {
      external: [
        // Node.js built-ins
        "fs",
        "path",
        "url",
        "http",
        "https",
        "os",
        "crypto",
        "stream",
        "util",
        "events",
        "buffer",
        "querystring",
        "child_process",
        "zlib",
        "net",
        "tls",
        "dns",
        // External dependencies that Vercel provides
        "express",
        "cors",
        "dotenv",
        "serverless-http",
      ],
      output: {
        format: "cjs",
        entryFileNames: "[name].cjs",
        exports: "default",
      },
    },
    minify: false,
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
