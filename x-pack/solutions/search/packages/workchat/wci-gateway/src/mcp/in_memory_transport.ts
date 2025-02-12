import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

/**
 * Creates a pair of transports that can communicate with each other directly.
 * This is useful for testing or for in-process communication between a client and server.
 */
export function createTransport(): {
  clientTransport: Transport;
  serverTransport: Transport;
} {
  const clientTransport = new InMemoryTransport();
  const serverTransport = new InMemoryTransport();

  clientTransport.connectTo(serverTransport);
  serverTransport.connectTo(clientTransport);

  return { clientTransport, serverTransport };
}

/**
 * A transport implementation that communicates directly with another InMemoryTransport instance.
 * This allows for in-memory communication between a client and server without network overhead.
 */
class InMemoryTransport implements Transport {
  _peerTransport?: InMemoryTransport;
  private _closed = false;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  async start(): Promise<void> {
    return new Promise((resolve) => {
      resolve();
    });
  }

  connectTo(peerTransport: InMemoryTransport): void {
    this._peerTransport = peerTransport;
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this._closed) {
      throw new Error("Transport is closed");
    }

    if (!this._peerTransport) {
      throw new Error("Not connected to another transport");
    }

    await Promise.resolve().then(() => {
      if (this._peerTransport?.onmessage) {
        try {
          this._peerTransport?.onmessage(message);
        } catch (error) {
          if (this._peerTransport?.onerror) {
            this._peerTransport.onerror(error instanceof Error ? error : new Error(String(error)));
          }
        }
      }
    });
  }

  async close(): Promise<void> {
    if (this._closed) {
      return;
    }

    this._closed = true;
    
    if (this._peerTransport && this._peerTransport.onclose) {
      await Promise.resolve().then(() => {
        if (this._peerTransport?.onclose) {
          this._peerTransport.onclose();
        }
      });
    }

    this._peerTransport = undefined;
    
    if (this.onclose) {
      this.onclose();
    }
  }
}