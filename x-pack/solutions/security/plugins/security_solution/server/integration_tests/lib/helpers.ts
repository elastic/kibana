/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidGen } from 'uuid';
import Fs from 'fs';
import Util from 'util';
import type { ElasticsearchClient } from '@kbn/core/server';
import deepmerge from 'deepmerge';
import { createTestServers, createRootWithCorePlugins } from '@kbn/core-test-helpers-kbn-server';

export const DEFAULT_GET_ROUTES: Array<[RegExp, unknown]> = [
  [new RegExp('.*/ping$'), { status: 200 }],
  [
    /.*kibana\/manifest\/artifacts.*/,
    {
      status: 200,
      data: 'x-pack/solutions/security/plugins/security_solution/server/lib/telemetry/__mocks__/kibana-artifacts.zip',
    },
  ],
];

export const DEFAULT_POST_ROUTES: Array<[RegExp, unknown]> = [[/.*/, { status: 200 }]];

const asyncUnlink = Util.promisify(Fs.unlink);

/**
 * Eventually runs a callback until it succeeds or times out.
 * Inspired in https://kotest.io/docs/assertions/eventually.html
 *
 * @param cb The callback to run/retry
 * @param duration The maximum duration to run the callback, default 10000 millisecs
 * @param interval The interval between each run, default 100 millisecs
 */
export async function eventually<T>(
  cb: () => Promise<T>,
  duration: number = 120000,
  interval: number = 3000
) {
  let elapsed = 0;

  while (true) {
    const startedAt: number = performance.now();
    try {
      return await cb();
    } catch (e) {
      if (elapsed >= duration) {
        throw e;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
    elapsed += performance.now() - startedAt;
  }
}

export async function setupTestServers(logFilePath: string, settings = {}) {
  const { startES } = createTestServers({
    adjustTimeout: (t) => jest.setTimeout(t),
    settings: {
      es: {
        license: 'trial',
      },
    },
  });

  const esServer = await startES();

  const root = createRootWithCorePlugins(
    deepmerge(
      {
        logging: {
          appenders: {
            file: {
              type: 'file',
              fileName: logFilePath,
              layout: {
                type: 'json',
              },
            },
          },
          root: {
            level: 'warn',
          },
          loggers: [
            {
              name: 'plugins.taskManager',
              level: 'warn',
              appenders: ['file'],
            },
            {
              name: 'plugins.securitySolution.telemetry_events',
              level: 'all',
              appenders: ['file'],
            },
          ],
        },
      },
      settings
    ),
    { oss: false }
  );

  await root.preboot();
  const coreSetup = await root.setup();
  const coreStart = await root.start();

  return {
    esServer,
    kibanaServer: {
      root,
      coreSetup,
      coreStart,
      stop: async () => root.shutdown(),
    },
  };
}

export async function removeFile(path: string) {
  await asyncUnlink(path).catch(() => void 0);
}

export async function bulkInsert(
  esClient: ElasticsearchClient,
  index: string,
  data: unknown[],
  ids: string[] = []
): Promise<void> {
  const operations = data.flatMap((d, i) => {
    const _id = ids[i] ?? uuidGen();
    return [{ create: { _index: index, _id } }, d];
  });
  await esClient.bulk({ operations, refresh: 'wait_for' }).catch(() => {});
}

export function updateTimestamps(data: object[]): object[] {
  const currentTimeMillis = new Date().getTime();
  return data.map((d, i) => {
    // wait a couple of millisecs to not make timestamps overlap
    return { ...d, '@timestamp': new Date(currentTimeMillis + (i + 1) * 100) };
  });
}

/**
 * Configures the global fetch mock to return responses based on URL patterns for POST requests.
 */
export function mockFetchPost(
  fetchSpy: jest.SpyInstance,
  postRoutes: Array<[RegExp, unknown]> = DEFAULT_POST_ROUTES,
  getRoutes: Array<[RegExp, unknown]> = DEFAULT_GET_ROUTES
) {
  fetchSpy.mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
    const method = init?.method?.toUpperCase() ?? 'GET';

    if (method === 'POST') {
      for (const [route, returnValue] of postRoutes) {
        if (route.test(urlStr)) {
          const rv = returnValue as { status?: number };
          return new Response(null, { status: rv?.status ?? 200 });
        }
      }
      return new Response(null, { status: 404 });
    }

    // GET requests (ping, artifacts, etc.)
    for (const [route, returnValue] of getRoutes) {
      if (route.test(urlStr)) {
        const rv = returnValue as { status?: number; data?: unknown };
        const body = rv?.data !== undefined ? rv.data : null;
        const responseBody =
          typeof body === 'string' ? body : body !== null ? JSON.stringify(body) : null;
        return new Response(responseBody, { status: rv?.status ?? 200 });
      }
    }
    return new Response(null, { status: 404 });
  });
}

/**
 * Updates the GET route responses for the fetch mock.
 */
export function mockFetchGet(
  fetchSpy: jest.SpyInstance,
  getRoutes: Array<[RegExp, unknown]> = DEFAULT_GET_ROUTES
) {
  const currentImpl = fetchSpy.getMockImplementation();
  fetchSpy.mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
    const method = init?.method?.toUpperCase() ?? 'GET';

    if (method !== 'POST') {
      for (const [route, returnValue] of getRoutes) {
        if (route.test(urlStr)) {
          const rv = returnValue as { status?: number; data?: unknown };
          const body = rv?.data !== undefined ? rv.data : null;
          const responseBody =
            typeof body === 'string' ? body : body !== null ? JSON.stringify(body) : null;
          return new Response(responseBody, { status: rv?.status ?? 200 });
        }
      }
      return new Response(null, { status: 404 });
    }

    // For POST, delegate to the current implementation
    if (currentImpl) {
      return currentImpl(url, init);
    }
    return new Response(null, { status: 200 });
  });
}

// Keep legacy names for backward compatibility during migration
export const mockAxiosPost = (_postSpy: jest.SpyInstance, _routes?: Array<[RegExp, unknown]>) => {};
export const mockAxiosGet = (_getSpy: jest.SpyInstance, _routes?: Array<[RegExp, unknown]>) => {};

export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
