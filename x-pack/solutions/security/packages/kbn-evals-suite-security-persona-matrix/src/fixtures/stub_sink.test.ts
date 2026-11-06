/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Node-only loopback server: this package is not on the node-only list in `.oxlint/import_plugin.mts`.
// eslint-disable-next-line import/no-nodejs-modules
import http from 'http';
// eslint-disable-next-line import/no-nodejs-modules
import type { AddressInfo } from 'net';
import { SINK_MARKER_HEADER, SINK_ORIGIN, startStubSink } from './stub_sink';

interface Reply {
  status: number | undefined;
  body: string;
  marker: string | string[] | undefined;
}

const request = (origin: string, method: string, path: string, payload?: string): Promise<Reply> =>
  new Promise((resolve, reject) => {
    const req = http.request(`${origin}${path}`, { method, agent: false }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () =>
        resolve({
          status: res.statusCode,
          body: Buffer.concat(chunks).toString(),
          marker: res.headers[SINK_MARKER_HEADER],
        })
      );
    });
    req.on('error', reject);
    req.end(payload);
  });

describe('stub sink', () => {
  it('uses a loopback origin', () => {
    expect(SINK_ORIGIN).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  });

  it('answers 200 {"ok":true} with the marker header for any method and path', async () => {
    const sink = await startStubSink({ port: 0 });
    try {
      for (const [method, path] of [
        ['GET', '/'],
        ['POST', '/api/status/chat.postMessage'],
        ['PUT', '/a/b/c?x=1'],
        ['DELETE', '/x'],
      ]) {
        const reply = await request(sink.origin, method, path, method === 'POST' ? '{"a":1}' : '');
        expect(reply.status).toBe(200);
        expect(JSON.parse(reply.body)).toEqual({ ok: true });
        expect(reply.marker).toBe('1');
      }
    } finally {
      await sink.close();
    }
  });

  it('bounds the body it consumes', async () => {
    const sink = await startStubSink({ port: 0 });
    try {
      const reply = await request(sink.origin, 'POST', '/big', 'x'.repeat(256 * 1024)).catch(
        (error: NodeJS.ErrnoException) => error
      );
      // Either an explicit 413 or the connection being cut: never a 200.
      if (reply instanceof Error) {
        expect(reply.code).toMatch(/ECONNRESET|EPIPE/);
      } else {
        expect(reply.status).toBe(413);
      }
    } finally {
      await sink.close();
    }
  });

  it('closes cleanly: the port stops accepting connections', async () => {
    const sink = await startStubSink({ port: 0 });
    const { origin } = sink;
    await sink.close();
    await expect(request(origin, 'GET', '/')).rejects.toMatchObject({ code: 'ECONNREFUSED' });
  });

  it('reuses a sink already running on the port and leaves it running on close', async () => {
    const first = await startStubSink({ port: 0 });
    try {
      const port = Number(new URL(first.origin).port);
      const second = await startStubSink({ port });
      expect(second.owned).toBe(false);
      expect(second.origin).toBe(first.origin);
      await second.close();
      expect((await request(first.origin, 'GET', '/')).status).toBe(200);
    } finally {
      await first.close();
    }
  });

  it('refuses a port held by something that is not our sink', async () => {
    const foreign = http.createServer((_req, res) => res.end('nope'));
    await new Promise<void>((resolve) => foreign.listen(0, '127.0.0.1', resolve));
    try {
      const { port } = foreign.address() as AddressInfo;
      await expect(startStubSink({ port })).rejects.toThrow(/not the persona-matrix stub sink/);
    } finally {
      await new Promise<void>((resolve) => foreign.close(() => resolve()));
    }
  });
});
