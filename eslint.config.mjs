import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig, globalIgnores } from "eslint/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const configDirectory = dirname(fileURLToPath(import.meta.url));

const ignoredPaths = [
  ".next/**",
  "out/**",
  "build/**",
  "coverage/**",
  "next-env.d.ts",
];

const compat = new FlatCompat({
  baseDirectory: configDirectory,
});

const eslintConfig = defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    linterOptions: {
      reportUnusedDisableDirectives: "warn",
    },
  },
  globalIgnores(ignoredPaths),
]);

export default eslintConfig;
