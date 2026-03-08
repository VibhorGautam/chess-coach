/**
 * Chess Move Coach - Stockfish Web Worker
 *
 * Runs inside a dedicated Web Worker. Loads the Stockfish WASM module
 * and proxies UCI commands from the main thread.
 *
 * Communication protocol:
 *   Main -> Worker: UCI command strings (e.g., "uci", "position fen ...", "go depth 18")
 *   Worker -> Main: UCI response strings (e.g., "info ...", "bestmove ...")
 *
 * The worker also accepts structured messages for lifecycle control:
 *   { type: "init" }          - Load and initialize Stockfish
 *   { type: "command", cmd }  - Send a raw UCI command
 *   { type: "quit" }          - Terminate the engine
 */

// ---------------------------------------------------------------------------
// Types for Worker-internal use
// ---------------------------------------------------------------------------

interface StockfishModule {
  postMessage: (cmd: string) => void;
  addMessageListener: (callback: (line: string) => void) => void;
}

// ---------------------------------------------------------------------------
// Worker State
// ---------------------------------------------------------------------------

let engine: StockfishModule | null = null;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Loads the Stockfish WASM module.
 *
 * Expects stockfish.js to be available at the path specified.
 * The module exposes `postMessage` and `addMessageListener` for UCI I/O.
 */
async function initEngine(): Promise<void> {
  try {
    // In a real deployment, this imports the stockfish.js WASM wrapper.
    // The path is relative to the public directory served by Next.js.
    //
    // stockfish.js (npm: stockfish.wasm) exports a factory function
    // that returns an object with postMessage/addMessageListener.
    //
    // For build-time type checking, we use dynamic import with a
    // ts-ignore since the module is loaded at runtime from public/.
    //
    // @ts-expect-error - Dynamic WASM module loaded at runtime
    const Stockfish = await import("/stockfish/stockfish.js");
    engine = await Stockfish.default();

    engine!.addMessageListener((line: string) => {
      // Forward all UCI output to the main thread
      self.postMessage({ type: "uci-output", line });
    });

    // Initialize UCI
    engine!.postMessage("uci");

    self.postMessage({ type: "ready" });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: `Failed to initialize Stockfish: ${error}`,
    });
  }
}

// ---------------------------------------------------------------------------
// Message Handler
// ---------------------------------------------------------------------------

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
        self.postMessage({
          type: "error",
          message: "Engine not initialized. Send 'init' first.",
        });
      }
      break;

    case "quit":
      if (engine) {
        engine.postMessage("quit");
      }
      self.close();
      break;

    default:
      self.postMessage({
        type: "error",
        message: `Unknown message type: ${msg.type}`,
      });
  }
};
