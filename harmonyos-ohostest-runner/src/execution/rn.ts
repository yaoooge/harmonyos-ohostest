import { shellQuote } from "./utils/shellQuote.js";
import type { BuildCommand, ExecutionConfig } from "./types/index.js";

// RNOH 工程：RN 根目录 + harmony/ 壳工程。构建顺序固定为
// npm install（HAR file: 引用依赖 node_modules）→ ohpm install（build.ts 基础命令）
// → codegen（--rnoh-module-path 依赖 oh_modules，必须在 ohpm install 之后）
// → bundle-harmony（产物写入 harmony/entry/src/main/resources/rawfile/）。
export function rnPrepareCommands(config: ExecutionConfig): BuildCommand[] {
  const root = config.rn?.root;
  if (!root) {
    throw new Error("case_rn_root_missing: ExecutionConfig.rn is required");
  }
  return [
    { command: rnInstallCommand(config), cwd: root },
    { command: rnCodegenCommand(config), cwd: root },
    { command: rnBundleCommand(), cwd: root },
  ];
}

function rnInstallCommand(config: ExecutionConfig): string {
  return `${shellQuote(config.paths.npm ?? "npm")} install --force`;
}

function rnCodegenCommand(config: ExecutionConfig): string {
  return (
    "npx react-native codegen-harmony" +
    ` --cpp-output-path ./harmony/${config.module}/src/main/cpp/generated` +
    ` --rnoh-module-path ./harmony/${config.module}/oh_modules/@rnoh/react-native-openharmony`
  );
}

function rnBundleCommand(): string {
  return "npx react-native bundle-harmony --dev";
}
