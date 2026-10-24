/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn } from 'child_process';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { createServer, request as httpRequest } from 'http';
import type { AddressInfo } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import { TELEMETRY_CUTOFF_PROXY_SOURCE } from './telemetry_cutoff';

const NOT_AFTER = '2026-04-19T16:27:00.000Z';

const postJson = (url: string, body: string): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = httpRequest(
      target,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          })
        );
      }
    );
    request.on('error', reject);
    request.end(body);
  });

/** Starts the sandbox proxy against a local upstream. */
const enforceTelemetryCutoff = async ({
  upstreamUrl,
  notAfter,
  path,
  body,
}: {
  upstreamUrl: string;
  notAfter: string;
  path: string;
  body: string;
}): Promise<{ status: number; body: string }> => {
  const directory = await mkdtemp(join(tmpdir(), 'nightshift-cutoff-'));
  const script = join(directory, 'proxy.py');
  const portFile = join(directory, 'port');
  await writeFile(script, TELEMETRY_CUTOFF_PROXY_SOURCE);
  const child = spawn('python3', [script], {
    env: {
      ...process.env,
      NIGHTSHIFT_TELEMETRY_UPSTREAM: upstreamUrl,
      NIGHTSHIFT_TELEMETRY_CUTOFF: notAfter,
      NIGHTSHIFT_TELEMETRY_PROXY_PORT_FILE: portFile,
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf8');
  });
  try {
    let port = '';
    for (let attempt = 0; attempt < 50 && !port; attempt++) {
      try {
        port = (await readFile(portFile, 'utf8')).trim();
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
    if (!port)
      throw new Error(`telemetry cutoff proxy did not start${stderr ? `: ${stderr}` : ''}`);
    return await postJson(`http://127.0.0.1:${port}${path}`, body);
  } finally {
    child.kill('SIGKILL');
    await rm(directory, { recursive: true, force: true });
  }
};

const listen = async (): Promise<{ url: string; close: () => Promise<void>; seen: string[] }> => {
  const seen: string[] = [];
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      seen.push(Buffer.concat(chunks).toString('utf8'));
      response.setHeader('content-type', 'application/json');
      response.end(
        JSON.stringify({ columns: [{ name: 'documents', type: 'long' }], values: [[3]] })
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    seen,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      ),
  };
};

describe('telemetry cutoff proxy', () => {
  it('returns no rows for a query after the cutoff and does not read upstream', async () => {
    const upstream = await listen();
    try {
      const result = await enforceTelemetryCutoff({
        upstreamUrl: upstream.url,
        notAfter: NOT_AFTER,
        path: '/_query',
        body: JSON.stringify({
          query:
            'FROM logs-orcabench.otel-* | WHERE @timestamp >= "2026-04-19T18:00:00.000Z" | STATS documents = COUNT(*)',
        }),
      });
      expect(JSON.parse(result.body)).toEqual({ columns: [], values: [] });
      expect(upstream.seen).toEqual([]);
    } finally {
      await upstream.close();
    }
  });

  it('returns upstream rows for a query inside the cutoff', async () => {
    const upstream = await listen();
    try {
      const result = await enforceTelemetryCutoff({
        upstreamUrl: upstream.url,
        notAfter: NOT_AFTER,
        path: '/_query',
        body: JSON.stringify({
          query:
            'FROM logs-orcabench.otel-* | WHERE @timestamp >= "2026-04-19T16:22:00.000Z" AND @timestamp < "2026-04-19T16:27:00.000Z" | STATS documents = COUNT(*)',
        }),
      });
      expect(JSON.parse(result.body).values).toEqual([[3]]);
      expect(JSON.parse(upstream.seen[0]).query).toContain(
        '@timestamp <= "2026-04-19T16:27:00.000Z"'
      );
    } finally {
      await upstream.close();
    }
  });

  it('returns no count for a Query DSL window after the cutoff', async () => {
    const upstream = await listen();
    try {
      const result = await enforceTelemetryCutoff({
        upstreamUrl: upstream.url,
        notAfter: NOT_AFTER,
        path: '/logs-orcabench.otel-*/_count',
        body: JSON.stringify({
          query: { range: { '@timestamp': { gte: '2026-04-19T18:00:00.000Z' } } },
        }),
      });
      expect(JSON.parse(result.body)).toEqual({ count: 0 });
      expect(upstream.seen).toEqual([]);
    } finally {
      await upstream.close();
    }
  });

  it('forwards an in-window Query DSL count with an upper bound', async () => {
    const upstream = await listen();
    try {
      await enforceTelemetryCutoff({
        upstreamUrl: upstream.url,
        notAfter: NOT_AFTER,
        path: '/logs-orcabench.otel-*/_count',
        body: JSON.stringify({
          query: { range: { '@timestamp': { gte: '2026-04-19T16:22:00.000Z' } } },
        }),
      });
      expect(upstream.seen[0]).toContain('"lte": "2026-04-19T16:27:00.000Z"');
    } finally {
      await upstream.close();
    }
  });
});
