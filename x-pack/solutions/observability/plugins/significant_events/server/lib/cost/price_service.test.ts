/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { loggerMock } from '@kbn/logging-mocks';
import { createPriceService, type PriceService, type PriceServiceFetch } from './price_service';

const mockFetchFn = (): jest.Mock<ReturnType<PriceServiceFetch>, Parameters<PriceServiceFetch>> =>
  jest.fn<ReturnType<PriceServiceFetch>, Parameters<PriceServiceFetch>>();

const FIXTURE: unknown[] = JSON.parse(
  readFileSync(resolve(__dirname, '__fixtures__/base_prices.json'), 'utf8')
) as unknown[];

const NOW = new Date('2026-09-09T12:00:00.000Z');
const MAX_BODY_BYTES = 4 * 1024 * 1024;

const jsonResponse = (
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {}
): Awaited<ReturnType<PriceServiceFetch>> => {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(text, {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json',
      'content-length': String(new TextEncoder().encode(text).byteLength),
      ...init.headers,
    },
  });
};

const catalogRow = (overrides: Record<string, unknown>) => ({
  id: 'global.inference-chat-input_test-model',
  name: 'Test Model - Chat Completion - Input',
  product_type: 'inference',
  start: '2026-01-01T00:00:00Z',
  end: null,
  unit: '1M Token',
  unit_amount: 1,
  token_tier: null,
  ...overrides,
});

const createService = ({
  fetchFn,
  getNow = () => new Date(NOW),
  timeoutMs = 10_000,
  cacheTtlMs = 6 * 60 * 60 * 1000,
  maxBodyBytes = MAX_BODY_BYTES,
  maxScopedRows = 10_000,
  baseUrl = 'https://cloud.elastic.co',
}: {
  fetchFn: PriceServiceFetch;
  getNow?: () => Date;
  timeoutMs?: number;
  cacheTtlMs?: number;
  maxBodyBytes?: number;
  maxScopedRows?: number;
  baseUrl?: string;
}): PriceService =>
  createPriceService({
    fetchFn,
    getNow,
    logger: loggerMock.create(),
    timeoutMs,
    cacheTtlMs,
    maxBodyBytes,
    maxScopedRows,
    baseUrl,
  });

describe('createPriceService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('parses operations from id, ignores embeddings, rerank, and cache-write forms, and preserves provider prefixes', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(jsonResponse(FIXTURE));
    const result = await createService({ fetchFn }).getPrices();

    expect([...(result?.prices.keys() ?? [])].sort()).toEqual([
      'anthropic-claude-4.6-sonnet',
      'openai-gpt-5.4',
      'openai-gpt-5.6-luna',
    ]);
    expect(result?.prices.get('anthropic-claude-4.6-sonnet')).toEqual({
      input: 4.5,
      output: 21,
      cacheRead: 0.45,
      tierThreshold: null,
    });
    expect(result?.prices.get('openai-gpt-5.4')).toEqual({
      input: 3.75,
      output: 21,
      cacheRead: 0.375,
      tierThreshold: 272_000,
    });
  });

  it('ignores malformed unsupported inference rows without discarding valid chat prices', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow({
          id: 'global.inference-chat-input_complete',
          name: 'Complete Model - Chat Completion - Input',
        }),
        catalogRow({
          id: 'global.inference-chat-output_complete',
          name: 'Complete Model - Chat Completion - Output',
          unit_amount: 2,
        }),
        {
          id: 'global.inference-embed-text-dense_incomplete',
          product_type: 'inference',
        },
        {
          id: 'global.inference-rerank_incomplete',
          product_type: 'inference',
        },
        {
          id: 'global.inference-chat-cache-write-5m_incomplete',
          product_type: 'inference',
        },
      ])
    );

    const result = await createService({ fetchFn }).getPrices();
    expect(result?.prices).toEqual(
      new Map([['complete-model', { input: 1, output: 2, cacheRead: null, tierThreshold: null }]])
    );
  });

  it('parses the model key from name with a case-insensitive chat-completion delimiter', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow({
          id: 'global.inference-chat-input_custom',
          name: 'Acme Provider Model - CHAT COMPLETION - Input',
        }),
        catalogRow({
          id: 'global.inference-chat-output_custom',
          name: 'Acme Provider Model - Chat Completion - Output',
          unit_amount: 2,
        }),
      ])
    );

    const result = await createService({ fetchFn }).getPrices();
    expect(result?.prices.get('acme-provider-model')).toEqual({
      input: 1,
      output: 2,
      cacheRead: null,
      tierThreshold: null,
    });
  });

  it('omits only a model whose lower and upper rows use different thresholds', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow({
          id: 'global.inference-chat-input_invalid_0-200k',
          name: 'Invalid Pair - Chat Completion - Input',
          token_tier: '<=200k',
        }),
        catalogRow({
          id: 'global.inference-chat-input_invalid_272k-inf',
          name: 'Invalid Pair - Chat Completion - Input',
          token_tier: '>272k',
          unit_amount: 2,
        }),
        catalogRow({
          id: 'global.inference-chat-output_invalid_0-200k',
          name: 'Invalid Pair - Chat Completion - Output',
          token_tier: '<=200k',
          unit_amount: 3,
        }),
        catalogRow({
          id: 'global.inference-chat-output_invalid_200k-inf',
          name: 'Invalid Pair - Chat Completion - Output',
          token_tier: '>200k',
          unit_amount: 4,
        }),
        catalogRow({
          id: 'global.inference-chat-input_valid',
          name: 'Valid Model - Chat Completion - Input',
          unit_amount: 4,
        }),
        catalogRow({
          id: 'global.inference-chat-output_valid',
          name: 'Valid Model - Chat Completion - Output',
          unit_amount: 5,
        }),
      ])
    );

    const result = await createService({ fetchFn }).getPrices();
    expect(result?.prices.has('invalid-pair')).toBe(false);
    expect(result?.prices.has('valid-model')).toBe(true);
  });

  it('applies exclusive end and inclusive start effective-date bounds', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow({
          id: 'global.inference-chat-input_expired',
          name: 'Bounded Model - Chat Completion - Input',
          start: '2026-01-01T00:00:00Z',
          end: NOW.toISOString(),
          unit_amount: 99,
        }),
        catalogRow({
          id: 'global.inference-chat-input_future',
          name: 'Bounded Model - Chat Completion - Input',
          start: '2026-09-10T00:00:00Z',
          unit_amount: 88,
        }),
        catalogRow({
          id: 'global.inference-chat-input_active',
          name: 'Bounded Model - Chat Completion - Input',
          start: NOW.toISOString(),
          unit_amount: 4,
        }),
        catalogRow({
          id: 'global.inference-chat-output_active',
          name: 'Bounded Model - Chat Completion - Output',
          start: NOW.toISOString(),
          unit_amount: 5,
        }),
      ])
    );

    const result = await createService({ fetchFn }).getPrices();
    expect(result?.prices.get('bounded-model')).toEqual({
      input: 4,
      output: 5,
      cacheRead: null,
      tierThreshold: null,
    });
  });

  it.each([
    ['wrong unit', { unit: '1M Tokens' }],
    ['null amount', { unit_amount: null }],
    ['negative amount', { unit_amount: -1 }],
    ['invalid effective date', { start: 'not-a-date' }],
    ['invalid token tier', { token_tier: 'first-200k' }],
    ['overlong model name', { name: 'x'.repeat(513) }],
  ])('rejects an effective chat row with %s', async (_caseName, overrides) => {
    const fetchFn = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow(overrides),
        catalogRow({
          id: 'global.inference-chat-output_test-model',
          name: 'Test Model - Chat Completion - Output',
        }),
      ])
    );

    await expect(createService({ fetchFn }).getPrices()).resolves.toBeNull();
  });

  it('accepts zero as a valid price boundary', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow({ unit_amount: 0 }),
        catalogRow({
          id: 'global.inference-chat-output_test-model',
          name: 'Test Model - Chat Completion - Output',
          unit_amount: 2,
        }),
      ])
    );

    await expect(createService({ fetchFn }).getPrices()).resolves.toMatchObject({
      prices: new Map([
        ['test-model', { input: 0, output: 2, cacheRead: null, tierThreshold: null }],
      ]),
    });
  });

  it('applies product and scope filters before enforcing the scoped-row limit', async () => {
    const accepted = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow({
          id: 'serverless.inference-chat-input_ignored',
          name: 'Ignored - Chat Completion - Input',
        }),
        {
          id: 'global.inference-chat-input_wrong-product',
          product_type: 'storage',
        },
        catalogRow({
          id: 'global.inference-chat-input_complete',
          name: 'Complete Flat - Chat Completion - Input',
        }),
        catalogRow({
          id: 'global.inference-chat-output_complete',
          name: 'Complete Flat - Chat Completion - Output',
          unit_amount: 2,
        }),
      ])
    );
    await expect(
      createService({ fetchFn: accepted, maxScopedRows: 2 }).getPrices()
    ).resolves.toMatchObject({
      prices: new Map([
        ['complete-flat', { input: 1, output: 2, cacheRead: null, tierThreshold: null }],
      ]),
    });

    const tooMany = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow({
          id: 'global.inference-chat-input_complete',
          name: 'Complete Flat - Chat Completion - Input',
        }),
        catalogRow({
          id: 'global.inference-chat-output_complete',
          name: 'Complete Flat - Chat Completion - Output',
          unit_amount: 2,
        }),
        catalogRow({
          id: 'global.inference-embed-text-dense_extra',
          name: 'Extra - Dense Text Embedding',
        }),
      ])
    );
    await expect(
      createService({ fetchFn: tooMany, maxScopedRows: 2 }).getPrices()
    ).resolves.toBeNull();
  });

  it('accepts an exact body-size limit and rejects one byte over it', async () => {
    const body = JSON.stringify(FIXTURE);
    const bytes = new TextEncoder().encode(body);
    const bodyResponse = () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
    });

    await expect(
      createService({
        fetchFn: mockFetchFn().mockResolvedValue(bodyResponse()),
        maxBodyBytes: bytes.byteLength,
      }).getPrices()
    ).resolves.toMatchObject({ stale: false });
    await expect(
      createService({
        fetchFn: mockFetchFn().mockResolvedValue(bodyResponse()),
        maxBodyBytes: bytes.byteLength - 1,
      }).getPrices()
    ).resolves.toBeNull();

    const exactHeader = mockFetchFn().mockResolvedValue(
      jsonResponse(FIXTURE, { headers: { 'content-length': String(bytes.byteLength) } })
    );
    await expect(
      createService({ fetchFn: exactHeader, maxBodyBytes: bytes.byteLength }).getPrices()
    ).resolves.toMatchObject({ stale: false });
    const overHeader = mockFetchFn().mockResolvedValue(
      jsonResponse(FIXTURE, { headers: { 'content-length': String(bytes.byteLength + 1) } })
    );
    await expect(
      createService({ fetchFn: overHeader, maxBodyBytes: bytes.byteLength }).getPrices()
    ).resolves.toBeNull();
  });

  it('keeps the timeout active while the body is still streaming', async () => {
    const fetchFn = mockFetchFn().mockImplementation((_url, init) => {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => null },
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            const onAbort = () => {
              controller.error(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
            };
            if (init.signal.aborted) {
              onAbort();
              return;
            }
            init.signal.addEventListener('abort', onAbort);
          },
        }),
      });
    });

    const pending = createService({ fetchFn, timeoutMs: 10_000 }).getPrices();
    await jest.advanceTimersByTimeAsync(10_000);
    await expect(pending).resolves.toBeNull();
  });

  it('returns one in-flight refresh to concurrent callers and uses the fresh cache afterward', async () => {
    let resolveFetch: (value: Awaited<ReturnType<PriceServiceFetch>>) => void = () => undefined;
    const fetchFn = mockFetchFn().mockImplementation(
      () =>
        new Promise((settle) => {
          resolveFetch = settle;
        })
    );
    const service = createService({ fetchFn });
    const first = service.getPrices();
    const second = service.getPrices();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    resolveFetch(jsonResponse(FIXTURE));
    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toEqual(secondResult);

    await expect(service.getPrices()).resolves.toEqual(firstResult);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['network rejection', () => Promise.reject(new Error('network down'))],
    ['non-success response', () => Promise.resolve(jsonResponse(FIXTURE, { status: 503 }))],
  ])('returns null on cold %s', async (_caseName, fetchImplementation) => {
    const fetchFn = mockFetchFn().mockImplementation(fetchImplementation);
    await expect(createService({ fetchFn }).getPrices()).resolves.toBeNull();
  });

  it('serves stale prices after a warm failure and recovers on the next refresh', async () => {
    const refreshedFixture = (FIXTURE as Array<Record<string, unknown>>).map((row) =>
      row.id === 'global.inference-chat-input_anthropic-claude-4-6-sonnet'
        ? { ...row, unit_amount: 5 }
        : row
    );
    const fetchFn = mockFetchFn()
      .mockResolvedValueOnce(jsonResponse(FIXTURE))
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(jsonResponse(refreshedFixture));
    const getNow = jest.fn(() => new Date(NOW));
    const service = createService({ fetchFn, getNow });

    const fresh = await service.getPrices();
    expect(fresh?.stale).toBe(false);
    expect(fresh?.fetchedAt).toBe(NOW.toISOString());

    getNow.mockReturnValue(new Date(NOW.getTime() + 6 * 60 * 60 * 1000));
    const stale = await service.getPrices();
    expect(stale).toEqual({
      prices: fresh?.prices,
      fetchedAt: NOW.toISOString(),
      stale: true,
    });

    const recoveredAt = new Date(NOW.getTime() + 7 * 60 * 60 * 1000);
    getNow.mockReturnValue(recoveredAt);
    const recovered = await service.getPrices();
    expect(recovered).toMatchObject({
      fetchedAt: recoveredAt.toISOString(),
      stale: false,
    });
    expect(recovered?.prices.get('anthropic-claude-4.6-sonnet')?.input).toBe(5);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('lets a newer coherent tier generation supersede an older flat generation', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(jsonResponse(FIXTURE));
    const result = await createService({ fetchFn }).getPrices();
    expect(result?.prices.get('openai-gpt-5.6-luna')).toEqual({
      input: 0.3,
      output: 1.68,
      cacheRead: 0.03,
      tierThreshold: 272_000,
    });
  });

  it('does not fall back when the latest generation is incomplete', async () => {
    const catalog = (FIXTURE as Array<Record<string, unknown>>).filter(
      (row) =>
        row.id !== 'global.inference-chat-input_openai-gpt-5-6-luna_272k-inf' &&
        typeof row.name === 'string' &&
        (row.name.startsWith('OpenAI GPT-5.6 Luna - Chat Completion') ||
          row.name.startsWith('Anthropic Claude 4.6 Sonnet - Chat Completion'))
    );
    const fetchFn = mockFetchFn().mockResolvedValue(jsonResponse(catalog));
    const result = await createService({ fetchFn }).getPrices();
    expect(result?.prices.has('anthropic-claude-4.6-sonnet')).toBe(true);
    expect(result?.prices.has('openai-gpt-5.6-luna')).toBe(false);
  });

  it('omits only the model whose latest operation generation has duplicate rows', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow({ unit_amount: 1 }),
        catalogRow({ unit_amount: 1 }),
        catalogRow({
          id: 'global.inference-chat-output_test-model',
          name: 'Test Model - Chat Completion - Output',
          unit_amount: 2,
        }),
        catalogRow({
          id: 'global.inference-chat-input_valid-sibling',
          name: 'Valid Sibling - Chat Completion - Input',
          unit_amount: 3,
        }),
        catalogRow({
          id: 'global.inference-chat-output_valid-sibling',
          name: 'Valid Sibling - Chat Completion - Output',
          unit_amount: 4,
        }),
      ])
    );
    const result = await createService({ fetchFn }).getPrices();
    expect(result?.prices.has('test-model')).toBe(false);
    expect(result?.prices.has('valid-sibling')).toBe(true);
  });

  it('omits a model that is missing input or output and accepts a missing cache-read price', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow({
          id: 'global.inference-chat-output_output-only',
          name: 'Output Only - Chat Completion - Output',
        }),
        catalogRow({
          id: 'global.inference-chat-input_complete',
          name: 'Complete Flat - Chat Completion - Input',
        }),
        catalogRow({
          id: 'global.inference-chat-output_complete',
          name: 'Complete Flat - Chat Completion - Output',
          unit_amount: 2,
        }),
      ])
    );
    const result = await createService({ fetchFn }).getPrices();
    expect(result?.prices.has('output-only')).toBe(false);
    expect(result?.prices.get('complete-flat')).toEqual({
      input: 1,
      output: 2,
      cacheRead: null,
      tierThreshold: null,
    });
  });

  it('omits a model whose operations mix flat and tiered prices', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow({
          id: 'global.inference-chat-input_mixed',
          name: 'Mixed Model - Chat Completion - Input',
        }),
        catalogRow({
          id: 'global.inference-chat-output_mixed_0-200k',
          name: 'Mixed Model - Chat Completion - Output',
          token_tier: '<=200k',
          unit_amount: 2,
        }),
        catalogRow({
          id: 'global.inference-chat-output_mixed_200k-inf',
          name: 'Mixed Model - Chat Completion - Output',
          token_tier: '>200k',
          unit_amount: 4,
        }),
        catalogRow({
          id: 'global.inference-chat-input_valid-sibling',
          name: 'Valid Sibling - Chat Completion - Input',
          unit_amount: 7,
        }),
        catalogRow({
          id: 'global.inference-chat-output_valid-sibling',
          name: 'Valid Sibling - Chat Completion - Output',
          unit_amount: 8,
        }),
      ])
    );
    const result = await createService({ fetchFn }).getPrices();
    expect(result?.prices.has('mixed-model')).toBe(false);
    expect(result?.prices.has('valid-sibling')).toBe(true);
  });
});
