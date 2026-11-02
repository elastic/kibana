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
import {
  TELEMETRY_CUTOFF_PROXY_PATH,
  TELEMETRY_CUTOFF_PROXY_SOURCE,
  telemetryCutoffCommand,
} from './telemetry_cutoff';

const NOT_AFTER = '2026-04-19T16:27:00.000Z';
const BOUND = { range: { '@timestamp': { lte: NOT_AFTER } } };

const send = (
  url: string,
  method: string,
  body: string
): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = httpRequest(
      target,
      {
        method,
        headers: body
          ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }
          : {},
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
  notAfter = NOT_AFTER,
  path,
  body = '',
  method = 'POST',
}: {
  upstreamUrl: string;
  notAfter?: string;
  path: string;
  body?: string;
  method?: string;
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
    return await send(`http://127.0.0.1:${port}${path}`, method, body);
  } finally {
    child.kill('SIGKILL');
    await rm(directory, { recursive: true, force: true });
  }
};

interface Upstream {
  url: string;
  close: () => Promise<void>;
  seen: string[];
  seenPaths: string[];
}

const listen = async (): Promise<Upstream> => {
  const seen: string[] = [];
  const seenPaths: string[] = [];
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      seen.push(Buffer.concat(chunks).toString('utf8'));
      seenPaths.push(request.url ?? '');
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
    seenPaths,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      ),
  };
};

const withUpstream = async (run: (upstream: Upstream) => Promise<void>): Promise<void> => {
  const upstream = await listen();
  try {
    await run(upstream);
  } finally {
    await upstream.close();
  }
};

describe('telemetry cutoff proxy', () => {
  it('bounds an ES|QL query inside the cutoff', () =>
    withUpstream(async (upstream) => {
      const result = await enforceTelemetryCutoff({
        upstreamUrl: upstream.url,
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
    }));

  it('leaves a lower bound in an OR to Elasticsearch', () =>
    withUpstream(async (upstream) => {
      await enforceTelemetryCutoff({
        upstreamUrl: upstream.url,
        path: '/_query',
        body: JSON.stringify({
          query:
            'FROM logs-* | WHERE @timestamp > "2026-04-19T18:00:00Z" OR service.name == "checkout"',
        }),
      });
      const { query } = JSON.parse(upstream.seen[0]);
      expect(query).toContain('OR service.name == "checkout"');
      expect(query.indexOf('@timestamp <= ')).toBeLessThan(query.indexOf('@timestamp > '));
    }));

  it.each([
    ['FROM logs-* | WHERE url.original == "http://a/b" | LIMIT 1', 'FROM logs-*'],
    ['FROM "logs-*" | WHERE message == "a | b"', 'FROM "logs-*"'],
    ['FROM logs-* | WHERE message RLIKE """a|b // c"""', 'FROM logs-*'],
    ['from logs-* | WHERE message == "say \\"hi\\" | now"', 'from logs-*'],
    ['FROM logs-* | WHERE message == "say \\" // hi"', 'FROM logs-*'],
  ])('adds the bound right after FROM in %s', (query, source) =>
    withUpstream(async (upstream) => {
      await enforceTelemetryCutoff({
        upstreamUrl: upstream.url,
        path: '/_query',
        body: JSON.stringify({ query }),
      });
      const forwarded: string = JSON.parse(upstream.seen[0]).query;
      expect(forwarded.startsWith(source)).toBe(true);
      expect(forwarded.slice(source.length).trimStart().startsWith('| WHERE @timestamp <= ')).toBe(
        true
      );
    })
  );

  it.each(['2026-04-19T16:00:00', '2026-04-19', 'now-1h'])(
    'bounds a query whose lower bound is %s',
    (lowerBound) =>
      withUpstream(async (upstream) => {
        const result = await enforceTelemetryCutoff({
          upstreamUrl: upstream.url,
          path: '/_query',
          body: JSON.stringify({ query: `FROM logs-* | WHERE @timestamp >= "${lowerBound}"` }),
        });
        expect(result.status).toBe(200);
        expect(JSON.parse(upstream.seen[0]).query).toContain('@timestamp <= ');
      })
  );

  it('bounds a Query DSL window after the cutoff instead of guessing it is empty', () =>
    withUpstream(async (upstream) => {
      const lowerBound = { range: { '@timestamp': { gte: '2026-04-19T18:00:00.000Z' } } };
      await enforceTelemetryCutoff({
        upstreamUrl: upstream.url,
        path: '/logs-orcabench.otel-*/_count',
        body: JSON.stringify({ query: lowerBound }),
      });
      expect(JSON.parse(upstream.seen[0]).query).toEqual({
        bool: { must: [lowerBound], filter: [BOUND] },
      });
    }));

  it('bounds a search that has no query or no body', () =>
    withUpstream(async (upstream) => {
      await enforceTelemetryCutoff({ upstreamUrl: upstream.url, path: '/logs-*/_search' });
      expect(JSON.parse(upstream.seen[0]).query).toEqual(BOUND);
    }));

  it('keeps the should requirement of a bool query', () =>
    withUpstream(async (upstream) => {
      const should = { bool: { should: [{ term: { 'service.name': 'checkout' } }] } };
      await enforceTelemetryCutoff({
        upstreamUrl: upstream.url,
        path: '/logs-*/_search',
        body: JSON.stringify({ query: should }),
      });
      expect(JSON.parse(upstream.seen[0]).query).toEqual({
        bool: { must: [should], filter: [BOUND] },
      });
    }));

  it('forwards the bounded body of a GET search', () =>
    withUpstream(async (upstream) => {
      await enforceTelemetryCutoff({
        upstreamUrl: upstream.url,
        method: 'GET',
        path: '/logs-*/_search',
        body: JSON.stringify({ query: { match_all: {} } }),
      });
      expect(JSON.parse(upstream.seen[0]).query.bool.filter).toEqual([BOUND]);
    }));

  it.each(['/logs-*/_search/', '/logs-*/%5Fsearch', '/logs-*/%5Fsearch/?pretty'])(
    'bounds the same search spelled %s',
    (path) =>
      withUpstream(async (upstream) => {
        await enforceTelemetryCutoff({
          upstreamUrl: upstream.url,
          path,
          body: JSON.stringify({ query: { match_all: {} } }),
        });
        expect(JSON.parse(upstream.seen[0]).query.bool.filter).toEqual([BOUND]);
      })
  );

  it.each([
    ['POST', '/_query/async'],
    ['POST', '/_sql'],
    ['POST', '/logs-*/_search/template'],
    ['POST', '/logs-*/_mget'],
    ['GET', '/logs-*/_doc/1'],
    ['GET', '/logs-*/_source/1'],
    ['POST', '/logs-*/_terms_enum'],
    ['POST', '/logs-*/_msearch'],
    ['POST', '/logs-*/_eql/search'],
    ['POST', '/logs-*/_async_search'],
    ['POST', '/_search/scroll'],
    ['POST', '/logs-*/_mapping'],
    ['POST', '/_bulk'],
  ])('refuses %s %s without reading upstream', (method, path) =>
    withUpstream(async (upstream) => {
      const result = await enforceTelemetryCutoff({
        upstreamUrl: upstream.url,
        method,
        path,
        body: '{}',
      });
      expect(result.status).toBe(403);
      expect(JSON.parse(result.body).error.type).toBe('telemetry_cutoff');
      expect(upstream.seen).toEqual([]);
    })
  );

  it.each<[string, string, string]>([
    ['a global aggregation', '/logs-*/_search', '{"aggs":{"all":{"global":{}}}}'],
    [
      'a nested global aggregation',
      '/logs-*/_search',
      '{"aggregations":{"a":{"terms":{"field":"x"},"aggs":{"all":{"global":{}}}}}}',
    ],
    ['a knn clause', '/logs-*/_search', '{"knn":{"field":"v"}}'],
    ['a retriever', '/logs-*/_search', '{"retriever":{"standard":{}}}'],
    ['runtime mappings', '/logs-*/_search', '{"runtime_mappings":{"@timestamp":{}}}'],
    ['the q parameter', '/logs-*/_search?q=*', '{"query":{"match_all":{}}}'],
    ['a body that is not JSON', '/logs-*/_search', 'not json'],
    ['a body that is not an object', '/logs-*/_search', '[]'],
    ['a query that is not an object', '/logs-*/_search', '{"query":"x"}'],
    ['an ES|QL query without FROM', '/_query', '{"query":"ROW a = 1"}'],
    ['a FROM after the first command', '/_query', '{"query":"ROW a = 1, from = 2 | LIMIT 1"}'],
    ['an ES|QL line comment', '/_query', '{"query":"FROM logs-* // telemetry"}'],
    ['an ES|QL block comment', '/_query', '{"query":"FROM logs-* /* | a */ | LIMIT 1"}'],
    ['a comment before FROM', '/_query', '{"query":"// FROM a | b\\nFROM logs-*"}'],
    ['an ES|QL subquery', '/_query', '{"query":"FROM a, (FROM b | LIMIT 1) | LIMIT 1"}'],
    ['an unterminated ES|QL string', '/_query', '{"query":"FROM \\"logs-* | LIMIT 1"}'],
    ['an ES|QL body without a query', '/_query', '{}'],
  ])('refuses %s without reading upstream', (_name, path, body) =>
    withUpstream(async (upstream) => {
      const result = await enforceTelemetryCutoff({ upstreamUrl: upstream.url, path, body });
      expect(result.status).toBe(403);
      expect(JSON.parse(result.body).error.type).toBe('telemetry_cutoff');
      expect(upstream.seen).toEqual([]);
    })
  );

  it('does not treat an aggregation named global as a global aggregation', () =>
    withUpstream(async (upstream) => {
      const result = await enforceTelemetryCutoff({
        upstreamUrl: upstream.url,
        path: '/logs-*/_search',
        body: JSON.stringify({ aggs: { global: { terms: { field: 'service.name' } } } }),
      });
      expect(result.status).toBe(200);
      expect(upstream.seen).toHaveLength(1);
    }));

  it.each([
    '/',
    '/_remote/info',
    '/_resolve/index/logs-*nginx*',
    '/_resolve/cluster/remote:logs-*',
    '/_cat/indices/logs-*?format=json',
    '/_field_caps?fields=service.name&include_unmapped=true',
    '/logs-*/_field_caps?fields=service.name',
    '/logs-*/_mapping',
  ])('forwards the metadata read GET %s unchanged', (path) =>
    withUpstream(async (upstream) => {
      const result = await enforceTelemetryCutoff({
        upstreamUrl: upstream.url,
        method: 'GET',
        path,
      });
      expect(result.status).toBe(200);
      expect(upstream.seenPaths).toEqual([path]);
    })
  );

  it('reports an unreachable cluster as a failed read, not as no data', async () => {
    const upstream = await listen();
    await upstream.close();
    const result = await enforceTelemetryCutoff({
      upstreamUrl: upstream.url,
      path: '/_query',
      body: JSON.stringify({ query: 'FROM logs-*' }),
    });
    expect(result.status).toBe(502);
    expect(JSON.parse(result.body).error.type).toBe('telemetry_unavailable');
    expect(result.body).not.toContain(upstream.url);
  });
});

describe('telemetry cutoff wrapper', () => {
  const runWrapper = async (
    userCommand: string,
    upstreamUrl: string
  ): Promise<{ exitCode: number | null; stdout: string }> => {
    const directory = await mkdtemp(join(tmpdir(), 'nightshift-cutoff-'));
    const script = join(directory, 'proxy.py');
    await writeFile(script, TELEMETRY_CUTOFF_PROXY_SOURCE);
    try {
      return await new Promise((resolve, reject) => {
        const child = spawn(
          'bash',
          ['-c', telemetryCutoffCommand().replace(TELEMETRY_CUTOFF_PROXY_PATH, script)],
          {
            env: {
              ...process.env,
              CONNECTOR_CONFIG_URL: upstreamUrl,
              NIGHTSHIFT_TELEMETRY_CUTOFF: NOT_AFTER,
              NIGHTSHIFT_SANDBOX_COMMAND: userCommand,
            },
            stdio: ['ignore', 'pipe', 'ignore'],
          }
        );
        let stdout = '';
        child.stdout?.on('data', (chunk: Buffer) => {
          stdout += chunk.toString('utf8');
        });
        child.on('error', reject);
        // `close` waits for stdout too, so a proxy left holding it times this test out.
        child.on('close', (exitCode) => resolve({ exitCode, stdout: stdout.trim() }));
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  };

  it.each([
    ['fails', 3],
    ['succeeds', 0],
  ])('stops the proxy and keeps the exit code when the command %s', async (_name, exitCode) =>
    withUpstream(async (upstream) => {
      const result = await runWrapper(
        `echo "$CONNECTOR_CONFIG_URL"; exit ${exitCode}`,
        upstream.url
      );
      expect(result.exitCode).toBe(exitCode);
      expect(result.stdout).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
      expect(result.stdout).not.toBe(upstream.url);
      await expect(send(`${result.stdout}/_remote/info`, 'GET', '')).rejects.toMatchObject({
        code: 'ECONNREFUSED',
      });
    })
  );
});
