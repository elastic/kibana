/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import type { AddressInfo } from 'net';

export const SINK_HOST = '127.0.0.1';
/** Fixed so the one fixed-id stub connector can point at it across runs and workers. */
export const SINK_PORT = 38465;
export const SINK_ORIGIN = `http://${SINK_HOST}:${SINK_PORT}`;
export const SINK_MARKER_HEADER = 'x-persona-matrix-sink';

const MAX_BODY_BYTES = 64 * 1024;
const PROBE_TIMEOUT_MS = 2_000;

export interface StubSink {
  origin: string;
  /** False when an already-running sink was reused; `close` is then a no-op. */
  owned: boolean;
  /** For tests only: production callers never close the shared sink. */
  close: () => Promise<void>;
}

const createSinkServer = (): http.Server =>
  http.createServer((req, res) => {
    let received = 0;
    let rejected = false;
    req.on('data', (chunk: Buffer) => {
      received += chunk.length;
      if (!rejected && received > MAX_BODY_BYTES) {
        rejected = true;
        res.writeHead(413, { connection: 'close', [SINK_MARKER_HEADER]: '1' });
        res.end();
        req.destroy();
      }
    });
    req.on('end', () => {
      if (rejected) return;
      res.writeHead(200, { 'content-type': 'application/json', [SINK_MARKER_HEADER]: '1' });
      res.end('{"ok":true}');
    });
    req.on('error', () => {});
  });

/** True when something on the loopback port answers `GET /` with our marker header. */
const isOurSink = (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    // Options-object form with a literal `path` is required by the js/kibana/unsafe-dynamic-http-path
    // CodeQL query; do not turn this back into a URL string.
    const req = http.get(
      { host: SINK_HOST, port, path: '/', agent: false, timeout: PROBE_TIMEOUT_MS },
      (res) => {
        res.resume();
        resolve(res.headers[SINK_MARKER_HEADER] === '1');
      }
    );
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(false));
  });

/**
 * Starts a loopback catch-all HTTP sink: 200 `{"ok":true}` for any method and
 * path, so an `.http` connector pointed at it completes every step. The `.http`
 * connector joins a step's `path` onto its base URL, so a real endpoint such as
 * Kibana's own API would answer 404 for the made-up paths authors write.
 *
 * Idempotent across workers and runs: when the port is taken by our own sink it
 * is reused (and not closed by this caller); when it is taken by anything else
 * the call rejects.
 *
 * Callers never close the sink. It is shared by every worker on the host, and
 * the first worker to finish would pull it out from under the rest. The server
 * is unref'd, so it never keeps a process alive and dies with its owner.
 *
 * Marker-header trust: the reuse check only proves the holder of the port
 * answered with `x-persona-matrix-sink: 1`. It does not prove the holder is our
 * process; any local process can send that header. That is acceptable because
 * the sink is loopback-only and only the stub connector is aimed at it: the
 * worst a spoofing process can do is receive (or answer) the stub's requests,
 * which carry no credentials.
 */
export const startStubSink = async ({
  port = SINK_PORT,
}: { port?: number } = {}): Promise<StubSink> => {
  const server = createSinkServer();
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, SINK_HOST, () => {
        server.off('error', reject);
        resolve();
      });
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error;
    if (!(await isOurSink(port))) {
      throw new Error(`port ${port} is in use and is not the persona-matrix stub sink`);
    }
    return { origin: `http://${SINK_HOST}:${port}`, owned: false, close: async () => {} };
  }

  server.unref();
  const origin = `http://${SINK_HOST}:${(server.address() as AddressInfo).port}`;
  return {
    origin,
    owned: true,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
};
