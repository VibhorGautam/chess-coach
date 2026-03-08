/**
 * Stockfish Web Worker - loads the lite single-threaded WASM build
 * and proxies UCI commands between main thread and engine.
 */

let engine = null;

self.onmessage = async function (e) {
  const msg = e.data;

  if (msg.type === "init") {
    try {
      // Load stockfish.js from same directory
      importScripts("stockfish.js");

      // Stockfish() is now a global factory function
      if (typeof Stockfish === "function") {
        engine = await Stockfish();
      } else {
        // Fallback: some builds expose it differently
        engine = Stockfish;
      }

      if (engine && engine.addMessageListener) {
        engine.addMessageListener(function (line) {
          self.postMessage({ type: "uci-output", line: line });
        });
        engine.postMessage("uci");
      } else if (engine && engine.onmessage === undefined) {
        // Alternative: engine uses postMessage/onmessage pattern
        self.postMessage({ type: "ready" });
      }
    } catch (err) {
      self.postMessage({ type: "error", message: "Failed to load Stockfish: " + err });
    }
    return;
  }

  if (msg.type === "command") {
    if (engine && engine.postMessage) {
      engine.postMessage(msg.cmd);
    }
    return;
  }

  if (msg.type === "quit") {
    if (engine && engine.postMessage) {
      engine.postMessage("quit");
    }
    self.close();
  }
};
