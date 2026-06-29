const FOLD_SERVER_START_PORT = 8766;

let nextPort = FOLD_SERVER_START_PORT;

export function allocateFoldServerPort(): { port: number; devicePort: number } {
  const port = nextPort;
  nextPort += 1;
  return { port, devicePort: port - 1 };
}
