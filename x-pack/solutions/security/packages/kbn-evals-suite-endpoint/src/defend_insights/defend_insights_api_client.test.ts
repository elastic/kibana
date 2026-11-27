/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { ToolingLog } from '@kbn/tooling-log';
import {
  DEFEND_INSIGHTS_POLL_MAX_WAIT_MS,
  DefendInsightsApiClient,
  REQUEST_TIMEOUT_MS,
} from './defend_insights_api_client';

const OPTIONS = { endpointId: 'agent-1', connectorId: 'c1', actionTypeId: '.inference' };
const field = (name: string, overrides: { allowed?: boolean; anonymized?: boolean } = {}) => ({
  id: name,
  field: name,
  allowed: true,
  anonymized: false,
  ...overrides,
});
const FIELDS = [field('process.executable'), field('agent.id'), field('_id')];
const without = (name: string) => FIELDS.filter((entry) => entry.field !== name);
const withOverride = (name: string, overrides: { allowed?: boolean; anonymized?: boolean }) =>
  FIELDS.map((entry) => (entry.field === name ? field(name, overrides) : entry));

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

type Route = (url: string, options: { method?: string }) => unknown;

/** Routes by URL; a route returns a value, or throws/rejects to simulate an HTTP error. */
const createFetch = (route: Route) => {
  const fetch = jest.fn(async (url: string, options: { method?: string }) =>
    route(url, options)
  ) as unknown as jest.Mock & HttpHandler;
  return fetch;
};

const isFind = (url: string) => url.includes('anonymization_fields/_find');
const isPost = (url: string, options: { method?: string }) =>
  !isFind(url) && options.method === 'POST';

describe('DefendInsightsApiClient', () => {
  const log = new ToolingLog({ level: 'silent', writeTo: process.stdout });

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  /** Starts the call and advances fake time until it settles. */
  const run = async (fetch: HttpHandler, pollMaxWaitMs?: number) => {
    const promise = new DefendInsightsApiClient(fetch, log).generateIncompatibleAntivirus({
      ...OPTIONS,
      pollMaxWaitMs,
    });
    await jest.advanceTimersByTimeAsync(DEFEND_INSIGHTS_POLL_MAX_WAIT_MS + 60_000);
    return promise;
  };

  const happyRoute =
    (getBody: () => unknown): Route =>
    (url, options) => {
      if (isFind(url)) return { data: FIELDS, total: FIELDS.length };
      if (isPost(url, options)) return { id: 'insight-1', status: 'running' };
      return getBody();
    };

  it('returns the insights and eventsContextCount of a succeeded generation', async () => {
    const insights = [{ group: 'Avast', events: [] }];
    const fetch = createFetch(
      happyRoute(() => ({ data: { status: 'succeeded', insights, eventsContextCount: 7 } }))
    );
    expect(await run(fetch)).toMatchObject({
      status: 'succeeded',
      insights,
      insightId: 'insight-1',
      eventsContextCount: 7,
    });
  });

  it('reports a failed generation with its failure reason', async () => {
    const fetch = createFetch(
      happyRoute(() => ({ data: { status: 'failed', failureReason: 'model exploded' } }))
    );
    expect(await run(fetch)).toMatchObject({
      status: 'failed',
      insights: null,
      error: expect.stringContaining('model exploded'),
    });
  });

  it('times out at the poll deadline instead of hanging', async () => {
    const fetch = createFetch(happyRoute(() => ({ data: { status: 'running' } })));
    expect(await run(fetch, 10_000)).toMatchObject({
      status: 'timed_out',
      error: expect.stringContaining('10s'),
    });
  });

  it('keeps polling through 404s inside the grace period, then recovers', async () => {
    let gets = 0;
    const fetch = createFetch(
      happyRoute(() => {
        gets += 1;
        if (gets <= 3) throw httpError(404);
        return { data: { status: 'succeeded', insights: [], eventsContextCount: 1 } };
      })
    );
    expect(await run(fetch)).toMatchObject({ status: 'succeeded' });
    expect(gets).toBe(4);
  });

  it('fails with request_failed once 404s outlast the grace period', async () => {
    const fetch = createFetch(
      happyRoute(() => {
        throw httpError(404);
      })
    );
    expect(await run(fetch)).toMatchObject({
      status: 'request_failed',
      error: expect.stringContaining('HTTP 404'),
    });
  });

  it.each([429, 500, 503])('retries a %s while polling', async (status) => {
    let gets = 0;
    const fetch = createFetch(
      happyRoute(() => {
        gets += 1;
        if (gets === 1) throw httpError(status);
        return { data: { status: 'succeeded', insights: [], eventsContextCount: 1 } };
      })
    );
    expect(await run(fetch)).toMatchObject({ status: 'succeeded' });
    expect(gets).toBe(2);
  });

  it('retries a poll whose own request timed out, even when the client wrapped the abort', async () => {
    let gets = 0;
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    const fetch = createFetch(
      happyRoute(() => {
        gets += 1;
        if (gets === 1) throw new Error('request failed', { cause: timeout });
        return { data: { status: 'succeeded', insights: [], eventsContextCount: 1 } };
      })
    );
    expect(await run(fetch)).toMatchObject({ status: 'succeeded' });
    expect(gets).toBe(2);
  });

  it('does not retry a 400 while polling', async () => {
    let gets = 0;
    const fetch = createFetch(
      happyRoute(() => {
        gets += 1;
        throw httpError(400);
      })
    );
    expect(await run(fetch)).toMatchObject({ status: 'request_failed' });
    expect(gets).toBe(1);
  });

  it('reports a failed POST as request_failed without polling', async () => {
    const fetch = createFetch((url, options) => {
      if (isFind(url)) return { data: FIELDS, total: FIELDS.length };
      if (isPost(url, options)) throw httpError(500);
      throw new Error('should not poll');
    });
    expect(await run(fetch)).toMatchObject({
      status: 'request_failed',
      error: expect.stringContaining('POST defend_insights HTTP 500'),
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  describe('anonymization fields lookup', () => {
    type FindCase = [name: string, findBody: () => unknown, message: string];
    const neverPosts =
      (findBody: () => unknown): Route =>
      (url, options) => {
        if (isFind(url)) return findBody();
        if (isPost(url, options)) throw new Error('must not POST without anonymization fields');
        throw new Error('must not poll');
      };

    it.each([
      [
        'an HTTP error',
        () => {
          throw httpError(500);
        },
        'anonymization_fields find HTTP 500',
      ],
      ['an empty list', () => ({ data: [], total: 0 }), 'returned no fields'],
      ['a missing data array', () => ({}), 'returned no fields'],
      ['a truncated page', () => ({ data: FIELDS, total: 1500 }), 'truncated: 3 of 1500'],
      ...['process.executable', 'agent.id', '_id'].flatMap<FindCase>((name) => [
        [
          `a missing ${name}`,
          () => ({ data: without(name), total: 2 }),
          `anonymization field "${name}" is missing`,
        ],
        [
          `${name} not allowed`,
          () => ({ data: withOverride(name, { allowed: false }), total: 3 }),
          `anonymization field "${name}" is not allowed`,
        ],
      ]),
      [
        'process.executable anonymized',
        () => ({ data: withOverride('process.executable', { anonymized: true }), total: 3 }),
        'anonymization field "process.executable" is anonymized',
      ],
    ])('is request_failed on %s and never POSTs', async (_name, findBody, message) => {
      const fetch = createFetch(neverPosts(findBody));
      expect(await run(fetch)).toMatchObject({
        status: 'request_failed',
        insights: null,
        error: expect.stringContaining(message),
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('cuts off a single stuck request and ends timed_out within the poll deadline', async () => {
    const neverSettles = (options: { signal?: AbortSignal }) =>
      new Promise<never>((_resolve, reject) => {
        options.signal?.addEventListener('abort', () =>
          reject(new Error('request failed', { cause: options.signal?.reason }))
        );
      });
    const fetch = createFetch((url, options) => {
      if (isFind(url)) return { data: FIELDS, total: FIELDS.length };
      if (isPost(url, options)) return { id: 'insight-1', status: 'running' };
      return neverSettles(options as { signal?: AbortSignal });
    });
    const timeoutSignal = (timeoutMs: number) => {
      const controller = new AbortController();
      setTimeout(
        () => controller.abort(Object.assign(new Error('timeout'), { name: 'TimeoutError' })),
        timeoutMs
      );
      return controller.signal;
    };

    const pollMaxWaitMs = 100_000;
    const promise = new DefendInsightsApiClient(
      fetch,
      log,
      timeoutSignal
    ).generateIncompatibleAntivirus({
      ...OPTIONS,
      pollMaxWaitMs,
    });
    await jest.advanceTimersByTimeAsync(pollMaxWaitMs + REQUEST_TIMEOUT_MS + 10_000);

    expect(await promise).toMatchObject({ status: 'timed_out', insightId: 'insight-1' });
    // Several GETs were attempted: each stuck one was cut off at its own timeout, not at the deadline.
    const gets = fetch.mock.calls.filter(([, options]) => options?.method === 'GET').length;
    expect(gets).toBeGreaterThan(2);
  });

  it('never asks for a non-positive request timeout near the poll deadline', async () => {
    const timeouts: number[] = [];
    const fetch = createFetch(happyRoute(() => ({ data: { status: 'running' } })));
    const promise = new DefendInsightsApiClient(fetch, log, (timeoutMs) => {
      timeouts.push(timeoutMs);
      return new AbortController().signal;
    }).generateIncompatibleAntivirus({ ...OPTIONS, pollMaxWaitMs: 10_000 });
    await jest.advanceTimersByTimeAsync(20_000);
    await promise;
    expect(timeouts.length).toBeGreaterThan(2);
    expect(Math.min(...timeouts)).toBeGreaterThanOrEqual(1);
  });

  it('gives every request an abort signal bounded by the per-request timeout', async () => {
    const fetch = createFetch(
      happyRoute(() => ({ data: { status: 'succeeded', insights: [], eventsContextCount: 1 } }))
    );
    await run(fetch);
    const signals = fetch.mock.calls.map(([, options]) => options?.signal);
    expect(signals).toHaveLength(3);
    signals.forEach((signal) => expect(signal).toBeInstanceOf(AbortSignal));
  });
});
