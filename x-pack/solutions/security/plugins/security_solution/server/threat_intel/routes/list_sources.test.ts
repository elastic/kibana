/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loadSourceReportStatsByAdapterId,
  loadSourceForMutationForTest,
  mapSourceHitForTest,
  scopedSourceId,
  createSourceBodySchemaForTest,
} from './list_sources';

describe('loadSourceReportStatsByAdapterId', () => {
  const logger = {
    warn: jest.fn(),
  };

  const defaultArgs = {
    spaceId: 'default',
    logger: logger as never,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns report counts keyed by adapter id', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        aggregations: {
          by_adapter_id: {
            buckets: [
              {
                key: 'rss:ti-rss-okta',
                doc_count: 3,
                last_ingested: { value_as_string: '2026-07-22T12:00:00.000Z' },
                env_hits: { value: 5 },
              },
            ],
          },
        },
      }),
    };

    const stats = await loadSourceReportStatsByAdapterId({
      ...defaultArgs,
      esClient: esClient as never,
    });

    expect(stats.get('rss:ti-rss-okta')).toEqual({
      report_count: 3,
      last_ingested_at: '2026-07-22T12:00:00.000Z',
      env_hits_total: 5,
    });
  });

  // Aggregating on source.name merged rows whenever two sources shared a
  // display name — the create API allows duplicates, and a space-private source
  // can share a name with a global one.
  it('keeps two sources that share a display name separate', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        aggregations: {
          by_adapter_id: {
            buckets: [
              { key: 'rss:private-copy', doc_count: 2, env_hits: { value: 1 } },
              { key: 'rss:global-copy', doc_count: 7, env_hits: { value: 4 } },
            ],
          },
        },
      }),
    };

    const stats = await loadSourceReportStatsByAdapterId({
      ...defaultArgs,
      esClient: esClient as never,
    });

    expect(stats.get('rss:private-copy')?.report_count).toBe(2);
    expect(stats.get('rss:global-copy')?.report_count).toBe(7);
  });

  it('aggregates on the stable adapter id rather than the mutable name', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        aggregations: { by_adapter_id: { buckets: [] } },
      }),
    };

    await loadSourceReportStatsByAdapterId({
      ...defaultArgs,
      esClient: esClient as never,
    });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        aggs: expect.objectContaining({
          by_adapter_id: expect.objectContaining({
            terms: expect.objectContaining({ field: 'source.adapter_id' }),
          }),
        }),
      })
    );
  });

  it('applies time_range to the report enrichment query', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        aggregations: { by_adapter_id: { buckets: [] } },
      }),
    };

    await loadSourceReportStatsByAdapterId({
      ...defaultArgs,
      esClient: esClient as never,
      timeRange: { from: '2026-07-16T00:00:00.000Z', to: '2026-07-23T00:00:00.000Z' },
    });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: expect.arrayContaining([
              {
                range: {
                  '@timestamp': {
                    gte: '2026-07-16T00:00:00.000Z',
                    lte: '2026-07-23T00:00:00.000Z',
                  },
                },
              },
            ]),
          },
        },
      })
    );
  });

  it('returns an empty map when enrichment search fails', async () => {
    const esClient = {
      search: jest.fn().mockRejectedValue(new Error('index missing')),
    };

    const stats = await loadSourceReportStatsByAdapterId({
      ...defaultArgs,
      esClient: esClient as never,
    });

    expect(stats.size).toBe(0);
  });
});

// ── Credential exposure ──────────────────────────────────────────────────────

describe('mapSourceHit', () => {
  // This route is gated on Security Read and lists global sources in every space,
  // so returning the raw config URL handed feed credentials to anyone who could
  // read the catalog.
  it('redacts credentials from the returned URL', () => {
    const mapped = mapSourceHitForTest({
      _id: 'default:rss:acme',
      _source: {
        name: 'Acme',
        adapter_type: 'rss',
        config: { url: 'https://feeduser:s3cret@feeds.example/rss.xml' },
      },
    });

    expect(mapped.url).toBe('https://feeds.example/rss.xml');
    expect(JSON.stringify(mapped)).not.toContain('s3cret');
  });

  it('leaves a credential-free URL alone', () => {
    const mapped = mapSourceHitForTest({
      _id: 'default:rss:acme',
      _source: {
        name: 'Acme',
        adapter_type: 'rss',
        config: { url: 'https://feeds.example/rss.xml' },
      },
    });

    expect(mapped.url).toBe('https://feeds.example/rss.xml');
  });

  it('omits the url when the source has none', () => {
    const mapped = mapSourceHitForTest({
      _id: 'default:kev:cisa',
      _source: { name: 'CISA', adapter_type: 'kev', config: {} },
    });

    expect(mapped.url).toBeUndefined();
  });
});

// ── Cross-space isolation ────────────────────────────────────────────────────

describe('scopedSourceId', () => {
  // Sources share one index. An unprefixed id meant two spaces creating the same
  // adapter and name targeted the same `_id`, so the second got a 409 that both
  // blocked a name it was entitled to and confirmed another space held it.
  it('namespaces the id by owning space', () => {
    expect(scopedSourceId('marketing', 'rss:acme')).toBe('marketing:rss:acme');
  });

  it('gives two spaces distinct ids for the same logical source', () => {
    expect(scopedSourceId('space-a', 'rss:acme')).not.toBe(scopedSourceId('space-b', 'rss:acme'));
  });
});

describe('loadSourceForMutation', () => {
  const globalSource = (spaceId?: string) => ({
    get: jest.fn().mockResolvedValue({
      _source: { name: 'Acme', adapter_type: 'rss', config: {}, space_id: spaceId },
    }),
  });

  it('allows a space to mutate its own source', async () => {
    const access = await loadSourceForMutationForTest({
      esClient: globalSource('space-a') as never,
      sourceId: 'space-a:rss:acme',
      spaceId: 'space-a',
    });

    expect(access.allowed).toBe(true);
  });

  // A 403 told the caller a source with this id exists in some other space, which
  // is an existence oracle across a boundary the rest of the feature treats as a
  // security boundary. Both outcomes have to look the same.
  it("reports another space's source as simply not found", async () => {
    const access = await loadSourceForMutationForTest({
      esClient: globalSource('space-a') as never,
      sourceId: 'space-a:rss:acme',
      spaceId: 'space-b',
    });

    expect(access).toEqual({ allowed: false });
  });

  it('reports a genuinely absent source the same way', async () => {
    const esClient = {
      get: jest.fn().mockRejectedValue(Object.assign(new Error('missing'), { statusCode: 404 })),
    };

    const access = await loadSourceForMutationForTest({
      esClient: esClient as never,
      sourceId: 'space-b:rss:nope',
      spaceId: 'space-b',
    });

    expect(access).toEqual({ allowed: false });
  });

  it('rethrows an unexpected Elasticsearch failure', async () => {
    const esClient = {
      get: jest.fn().mockRejectedValue(Object.assign(new Error('boom'), { statusCode: 503 })),
    };

    await expect(
      loadSourceForMutationForTest({
        esClient: esClient as never,
        sourceId: 'x',
        spaceId: 'default',
      })
    ).rejects.toThrow('boom');
  });
});

// ── vendor_api handler binding ────────────────────────────────────────────────

describe('create source schema — vendor', () => {
  const body = (over: Record<string, unknown> = {}) => ({
    name: 'Acme',
    adapter_type: 'rss',
    url: 'https://feeds.example/rss.xml',
    ...over,
  });

  it('accepts a source with no vendor for a non-vendor adapter', () => {
    expect(() => createSourceBodySchemaForTest.validate(body())).not.toThrow();
  });

  // A vendor feed needs a response-shape handler that only exists in code, and an
  // API-created source's id is namespaced by space so it can never match one.
  // Without a vendor the source is created and then produces nothing on every fetch.
  it('accepts a known built-in vendor', () => {
    expect(() =>
      createSourceBodySchemaForTest.validate(
        body({ adapter_type: 'vendor_api', vendor: 'vendor_api:elastic-security-labs' })
      )
    ).not.toThrow();
  });

  it('rejects a vendor that has no built-in handler', () => {
    expect(() =>
      createSourceBodySchemaForTest.validate(
        body({ adapter_type: 'vendor_api', vendor: 'vendor_api:does-not-exist' })
      )
    ).toThrow(/must be one of/);
  });

  it('bounds the vendor length', () => {
    expect(() =>
      createSourceBodySchemaForTest.validate(
        body({ adapter_type: 'vendor_api', vendor: 'v'.repeat(300) })
      )
    ).toThrow();
  });
});
