import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules", "assets/generated"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
