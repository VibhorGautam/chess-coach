interface StockfishModule {
  postMessage: (cmd: string) => void;
  addMessageListener: (callback: (line: string) => void) => void;
}

let engine: StockfishModule | null = null;

async function initEngine(): Promise<void> {
  try {
    // @ts-expect-error Dynamic WASM module loaded at runtime from public/
    const Stockfish = await import("/stockfish/stockfish.js");
    engine = await Stockfish.default();

    engine!.addMessageListener((line: string) => {
      self.postMessage({ type: "uci-output", line });
    });

    engine!.postMessage("uci");
    self.postMessage({ type: "ready" });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: `Failed to initialize Stockfish: ${error}`,
    });
  }
}

self.onmessage = (event: MessageEvent) => {
  const msg = event.data;

  switch (msg.type) {
    case "init":
      initEngine();
      break;

    case "command":
      if (engine) {
        engine.postMessage(msg.cmd);
      } else {
        self.postMessage({ type: "error", message: "Engine not initialized." });
      }
      break;

    case "quit":
      if (engine) engine.postMessage("quit");
      self.close();
      break;
  }
};
