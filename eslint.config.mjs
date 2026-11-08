import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
const config = [
  { ignores: [".research/**", ".next/**", "artifacts/**", "lib/generated/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { files: ["test/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
];
export default config;
