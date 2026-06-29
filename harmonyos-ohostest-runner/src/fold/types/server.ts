import type { ChildProcess } from "node:child_process";

export interface FoldServerInstance {
  port: number;
  devicePort: number;
  process: ChildProcess;
}
