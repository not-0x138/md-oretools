import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "md-oretools | マスターデュエル用ツール",
        short_name: "md-oretools",
        description:
          "遊戯王マスターデュエルを便利にする個人用Webポータル（初手確率計算・誘発カンペ・戦績記録）",
        theme_color: "#0f1219",
        background_color: "#0f1219",
        display: "standalone",
        lang: "ja",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Phase 3 で導入予定の大容量 OCR 学習データはプリキャッシュ対象から除外する
        globIgnores: ["**/tesseract/**", "**/*.traineddata*"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      thresholds: {
        lines: 80,
        statements: 80,
      },
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/components/ui/**",
        "src/app/**",
        "src/features/*/components/**",
        "src/features/*/hooks/**",
        "src/features/*/index.ts",
        "src/shared/db/database.ts",
        "src/shared/lib/useTransientMessage.ts",
        "src/shared/lib/cn.ts",
        "src/main.tsx",
      ],
    },
  },
});
