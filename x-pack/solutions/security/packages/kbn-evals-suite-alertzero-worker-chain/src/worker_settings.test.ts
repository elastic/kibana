/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { captureWorker, restoreWorker, spacePath, writeWorkerAutonomy } from './worker_settings';

describe('spacePath', () => {
  it('leaves the default space unprefixed', () => {
    expect(spacePath('default', '/internal/x')).toBe('/internal/x');
  });

  it('prefixes a non-default space (G20)', () => {
    expect(spacePath('sec team', '/internal/x')).toBe('/s/sec%20team/internal/x');
  });
});

describe('worker settings round trip (B3/B4)', () => {
  const makeFetch = () => {
    const calls: Array<{ path: string; options: Record<string, unknown> }> = [];
    let worker = {
      id: 'w1',
      enabled: false,
      settingsRevision: 3,
      settings: { autonomy: 'manual' },
    };
    const fetch = jest.fn(async (path: string, options: Record<string, unknown>) => {
      calls.push({ path, options });
      if (options.method === 'PATCH') {
        const body = JSON.parse(options.body as string);
        worker = {
          ...worker,
          enabled: body.enabled ?? worker.enabled,
          settingsRevision: (worker.settingsRevision ?? 0) + 1,
          settings: { ...worker.settings, ...body.settings },
        };
        return {};
      }
      return { workers: [worker] };
    }) as unknown as HttpHandler;
    return { fetch, calls, current: () => worker };
  };

  it('writes only valid body keys, in the requested space, and restores the captured state', async () => {
    const { fetch, calls, current } = makeFetch();
    const ctx = { fetch, spaceId: 'team-a' };

    const snapshot = await captureWorker(ctx, 'w1');
    await writeWorkerAutonomy(ctx, 'w1', 'supervised');
    expect(current().settings.autonomy).toBe('supervised');
    expect(current().enabled).toBe(true);

    await restoreWorker(ctx, snapshot);
    expect(current().settings.autonomy).toBe('manual');
    expect(current().enabled).toBe(false);

    const patches = calls.filter((c) => c.options.method === 'PATCH');
    expect(patches).toHaveLength(2);
    for (const { path, options } of calls) {
      expect(path.startsWith('/s/team-a/')).toBe(true);
      if (options.method === 'PATCH') {
        // workerId is the route param, never part of the body.
        expect(Object.keys(JSON.parse(options.body as string)).sort()).not.toContain('workerId');
      }
    }
  });
});
