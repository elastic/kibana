/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import { MEMORY_INDEX } from '../../common/memory';
import { HALF_LIFE_SEC } from './ranking';
import {
  canonicalizeSlug,
  createMemoryPageStore,
  epochSecondsToIso,
  isCanonicalMemoryId,
  toMemoryDisplayTelemetry,
  toMemoryKiId,
} from './page_store';

const T0 = 1_000_000;
const T0_ISO = epochSecondsToIso(T0);

const source = {
  '@timestamp': T0_ISO,
  type: 'memory',
  title: 'Kafka lag',
  description: 'Checkout consumer lag',
  content: 'Scale the consumer.',
  tags: ['memory', 'kafka'],
  attributes: {
    status: 'established' as const,
    slug: 'kafka-lag',
    space_id: 'space-a',
    impressions: 10,
    conversions: 3,
    last_impression_time: T0_ISO,
    categories: ['kafka'],
    references: [],
    created_at: T0_ISO,
    updated_at: T0_ISO,
    created_by: 'sre',
    updated_by: 'sre',
  },
};

describe('canonicalizeSlug / toMemoryKiId', () => {
  it('strips a memory- prefix copied from document ids', () => {
    expect(canonicalizeSlug('memory-kafka-lag')).toBe('kafka-lag');
    expect(toMemoryKiId('Kafka Lag')).toBe('memory_kafka-lag');
  });

  it('never ends a truncated slug with a hyphen, so the id stays canonical', () => {
    const id = toMemoryKiId(`${'a'.repeat(79)} b`);
    expect(id).toBe(`memory_${'a'.repeat(79)}`);
    expect(isCanonicalMemoryId(id)).toBe(true);
  });

  it.each([
    'Memory Memory Memory Pressure',
    'memory--memory-x',
    `${'a'.repeat(79)} b`,
    'Kafka Lag',
  ])('is idempotent, so the id written for %p is canonical', (title) => {
    const slug = canonicalizeSlug(title);
    expect(canonicalizeSlug(slug)).toBe(slug);
    expect(isCanonicalMemoryId(toMemoryKiId(slug))).toBe(true);
  });
});

describe('createMemoryPageStore', () => {
  const logger = loggerMock.create();

  it('lists pages with raw counters and space-scoped ids', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [{ _id: 'space-a:memory_kafka-lag', _source: source }],
        },
      }),
    };

    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0 + HALF_LIFE_SEC,
    });

    const result = await store.list();

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].id).toBe('memory_kafka-lag');
    expect(result.pages[0].telemetry).toEqual({
      impressions: 10,
      conversions: 3,
      last_impression_time: T0_ISO,
    });
    expect(result.stats.total).toBe(1);
    expect(result.stats.decayed_impressions).toBeCloseTo(5, 10);
    expect(result.stats.decayed_conversions).toBeCloseTo(1.5, 10);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [{ term: { tags: 'memory' } }, { term: { 'attributes.space_id': 'space-a' } }],
          },
        },
      }),
      expect.anything()
    );
  });

  it('reads archived pages but filters them out of an active listing', async () => {
    const archived = {
      ...source,
      attributes: { ...source.attributes, archive_reason: 'harmful' as const },
    };
    // The store delegates filtering to Elasticsearch, so the mock answers per
    // query. `active` nests the archive_reason check under a `must_not`; that is
    // the difference between excluding archived pages and selecting them.
    const search = jest.fn(({ query }: { query: { bool: Record<string, unknown> } }) => {
      const bool = query.bool ?? {};
      // `active` is the only filter that *excludes* archived pages, and it does
      // so by negating an `exists` check. `all` omits the check entirely and
      // `archived` asserts it, so both still return the page.
      const clause = JSON.stringify(bool);
      const excludesArchived = /must_not[^\]]*archive_reason/.test(clause);
      const hit = { _id: 'space-a:memory_kafka-lag', _source: archived };
      return Promise.resolve({ hits: { hits: excludesArchived ? [] : [hit] } });
    });
    const esClient = {
      search,
      get: jest.fn().mockResolvedValue({
        found: true,
        _id: 'space-a:memory_kafka-lag',
        _source: archived,
      }),
    };

    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    await expect(store.list({ filter: 'active' })).resolves.toMatchObject({ pages: [] });

    // `all` has no archive_reason clause, so the archived page comes back.
    const all = await store.list({ filter: 'all' });
    expect(all.pages).toHaveLength(1);
    expect(all.pages[0]).toMatchObject({ archived: true, archive_reason: 'harmful' });

    // `archived` filters on the reason being present.
    const archivedOnly = await store.list({ filter: 'archived' });
    expect(archivedOnly.pages).toHaveLength(1);

    const got = await store.get('memory_kafka-lag');
    expect(got?.archived).toBe(true);
    expect(got?.telemetry.impressions).toBe(10);
  });

  it('sends one shared archived clause everywhere, not just an exists check', async () => {
    const search = jest.fn().mockResolvedValue({ hits: { hits: [] } });
    const store = createMemoryPageStore({
      esClient: { search } as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    await store.list({ filter: 'active' });
    const activeClause = JSON.stringify(search.mock.calls[0][0]);
    // Both archived markers, in one clause: `archive_reason` is what is written,
    // and legacy `status: 'archived'` is only read so pre-existing documents
    // cannot show up as active or be recalled.
    expect(activeClause).toContain('attributes.archive_reason');
    expect(activeClause).toContain('"attributes.status":"archived"');
    // Anything else on the removed `status` field must stay out of the query.
    expect(activeClause).not.toContain('"attributes.status":"established"');
    expect(activeClause).not.toContain('"attributes.status":"tentative"');
  });

  it('treats a legacy status-only archived document as archived in every query', async () => {
    // A document written before `archive_reason` existed. The read path already
    // derived `archived: true` from it, so the queries have to agree — otherwise
    // it is listed as active and handed to the agent.
    const legacy = {
      ...source,
      attributes: { ...source.attributes, status: 'archived' as const },
    };
    delete (legacy.attributes as { archive_reason?: string }).archive_reason;
    const search = jest.fn(() =>
      Promise.resolve({ hits: { hits: [{ _id: 'space-a:memory_kafka-lag', _source: legacy }] } })
    );
    const store = createMemoryPageStore({
      esClient: {
        search,
        get: jest.fn().mockResolvedValue({
          found: true,
          _id: 'space-a:memory_kafka-lag',
          _source: legacy,
        }),
      } as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    expect((await store.get('memory_kafka-lag'))?.archived).toBe(true);

    // The legacy marker has to be in every query that excludes archived pages:
    // the active listing, the archived listing, the archived count, and recall.
    await store.list({ filter: 'active' });
    await store.listPaginated({ filter: 'archived' });
    await store.retrieve();

    const calls = search.mock.calls as unknown as Array<[Record<string, never>]>;
    const serialized = calls.map(([request]) => JSON.stringify(request));
    // 0: active listing. 1: archived listing page. 2: its stats aggregation. 3: recall.
    expect(serialized[0]).toContain('"attributes.status":"archived"');
    expect(serialized[1]).toContain('"attributes.status":"archived"');
    expect(serialized[3]).toContain('"attributes.status":"archived"');
    // The archived count is a filter aggregation, so it has to use the same clause
    // or the header reports a legacy archived page as active.
    const statsQuery = calls[2][0] as unknown as {
      aggs: { archived: { filter: unknown } };
    };
    expect(statsQuery.aggs.archived.filter).toEqual({
      bool: {
        should: [
          { exists: { field: 'attributes.archive_reason' } },
          { term: { 'attributes.status': 'archived' } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('paginates on a total order so no row is skipped or repeated', async () => {
    // Every row shares an `updated_at`, so the slug tiebreaker is what keeps the
    // order total. Sorting on `_id` instead is not an option: Elasticsearch
    // rejects it (`indices.id_field_data.enabled`).
    const sort = { '@timestamp': '2026-01-01T00:00:00.000Z' };
    const page = (ids: string[]) => ({
      hits: {
        total: { value: 3, relation: 'eq' },
        hits: ids.map((id) => {
          // The sort values mirror what Elasticsearch returns for the sort
          // clause: `updated_at`, then the slug tiebreaker (not `_id`).
          const slug = id.replace('memory_', '');
          return {
            _id: `space-a:${id}`,
            _source: {
              ...source,
              '@timestamp': sort['@timestamp'],
              attributes: { ...source.attributes, slug },
            },
            sort: [sort['@timestamp'], slug],
          };
        }),
      },
    });
    // `listPaginated` issues a page query and a separate stats aggregation, so
    // the mock answers by shape rather than by call order: a query carrying
    // `size: 0` is the aggregation and returns no hits.
    interface PageRequest {
      size?: number;
      search_after?: unknown[];
    }
    const search = jest.fn((request: PageRequest) => {
      if (request.size === 0) {
        return Promise.resolve({
          hits: { total: { value: 3, relation: 'eq' }, hits: [] },
          aggregations: {
            archived: { doc_count: 1 },
            impressions: { value: 30 },
            conversions: { value: 12 },
          },
        });
      }
      if (!request.search_after) {
        return Promise.resolve(page(['memory_a', 'memory_b']));
      }
      return Promise.resolve(page(['memory_c']));
    });

    const store = createMemoryPageStore({
      esClient: { search } as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    const first = await store.listPaginated({ size: 2 });
    expect(first.pages.map((row) => row.id)).toEqual(['memory_a', 'memory_b']);
    expect(first.total).toBe(3);
    // A full page may have more behind it, so a cursor is offered.
    expect(first.cursor).toBeDefined();

    const second = await store.listPaginated({ size: 2, cursor: first.cursor });
    expect(second.pages.map((row) => row.id)).toEqual(['memory_c']);
    // A short page means the result set is exhausted.
    expect(second.cursor).toBeUndefined();

    // The second request must resume from the *first page's last row*, which is
    // what `search_after` means — not an offset, and not the second page's own
    // values. The tiebreaker is the slug, never `_id`.
    const secondQuery = (search.mock.calls as [PageRequest][]).find((call) => call[0].search_after);
    expect(secondQuery?.[0].search_after).toEqual([sort['@timestamp'], 'b']);
    // Together the two pages cover every id exactly once.
    expect([...first.pages, ...second.pages].map((row) => row.id)).toEqual([
      'memory_a',
      'memory_b',
      'memory_c',
    ]);
  });

  it('ignores a malformed cursor rather than failing the listing', async () => {
    const search = jest
      .fn()
      .mockResolvedValue({ hits: { total: { value: 0, relation: 'eq' }, hits: [] } });
    const store = createMemoryPageStore({
      esClient: { search } as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    const result = await store.listPaginated({ cursor: 'not-a-cursor' });
    expect(result.pages).toEqual([]);
    expect(search.mock.calls[0][0].search_after).toBeUndefined();
  });

  it('rejects a cursor that decodes to the wrong shape, not just an unparseable one', async () => {
    const search = jest
      .fn()
      .mockResolvedValue({ hits: { total: { value: 0, relation: 'eq' }, hits: [] } });
    const store = createMemoryPageStore({
      esClient: { search } as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });
    const encode = (value: unknown) =>
      Buffer.from(JSON.stringify(value), 'utf8').toString('base64');

    // A token of the wrong arity would resume from a partial sort key, and one
    // carrying a nested object is not a `search_after` value at all.
    for (const cursor of [
      encode(['2026-01-01T00:00:00.000Z']),
      encode([{ at: '2026-01-01T00:00:00.000Z' }, 'kafka-lag']),
      encode([123, null]),
      Buffer.from('not json at all', 'utf8').toString('base64'),
    ]) {
      const result = await store.listPaginated({ cursor });
      expect(result.pages).toEqual([]);
      expect(search.mock.calls[0][0].search_after).toBeUndefined();
    }
  });

  it('takes total and stats from the whole filtered set, not from the page slice', async () => {
    // The page query returns one row out of many, and the aggregation runs
    // separately with no paging. If the header numbers came from the page slice
    // they would shrink as the operator scrolls.
    const search = jest.fn(({ size }: { size?: number }) =>
      Promise.resolve(
        size === 0
          ? {
              hits: { total: { value: 137, relation: 'eq' }, hits: [] },
              aggregations: {
                archived: { doc_count: 12 },
                impressions: { value: 900 },
                conversions: { value: 300 },
              },
            }
          : {
              hits: {
                total: { value: 137, relation: 'eq' },
                hits: [{ _id: 'space-a:memory_a', _source: source }],
              },
            }
      )
    );
    const store = createMemoryPageStore({
      esClient: { search } as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    const result = await store.listPaginated({ size: 25 });

    expect(result.pages).toHaveLength(1);
    expect(result.total).toBe(137);
    expect(result.stats).toEqual({
      total: 137,
      archived: 12,
      decayed_impressions: 900,
      decayed_conversions: 300,
    });
  });

  it('sums the counters with a script, because sum is rejected on a flattened field', async () => {
    // `attributes` is mapped `flattened`, so Elasticsearch refuses
    // `sum: { field: 'attributes.impressions' }` with an illegal_argument_exception
    // and the whole list route 500s. A script sum is the supported form.
    const search = jest.fn().mockResolvedValue({
      hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      aggregations: { archived: { doc_count: 0 } },
    });
    const store = createMemoryPageStore({
      esClient: { search } as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    await store.listPaginated();

    const statsQuery = search.mock.calls[1][0];
    expect(statsQuery.aggs.impressions).toEqual({
      sum: { script: { source: expect.stringContaining("doc['attributes.impressions']") } },
    });
    expect(statsQuery.aggs.conversions).toEqual({
      sum: { script: { source: expect.stringContaining("doc['attributes.conversions']") } },
    });
    expect(JSON.stringify(statsQuery.aggs)).not.toContain('"field":"attributes.impressions"');
  });

  it('reports empty stats rather than failing when the index does not exist yet', async () => {
    const search = jest.fn().mockRejectedValue(
      new errors.ResponseError({
        statusCode: 404,
        body: { error: { type: 'index_not_found_exception' } },
      } as never)
    );
    const store = createMemoryPageStore({
      esClient: { search } as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    // The index is created lazily, so an empty Semantic Memory is a 404 from
    // Elasticsearch rather than an error the operator should see.
    await expect(store.listPaginated()).resolves.toEqual({
      pages: [],
      stats: { total: 0, archived: 0, decayed_impressions: 0, decayed_conversions: 0 },
      total: 0,
    });
  });

  it('decays display telemetry without rewriting stored last_impression_time', () => {
    const page = {
      id: 'memory_kafka-lag',
      slug: 'kafka-lag',
      title: 'Kafka lag',
      content: 'Scale the consumer.',
      tags: ['memory'],
      archived: false as const,
      categories: [],
      references: [],
      created_at: T0_ISO,
      updated_at: T0_ISO,
      created_by: 'sre',
      updated_by: 'sre',
      telemetry: {
        impressions: 10,
        conversions: 3,
        last_impression_time: T0_ISO,
      },
    };

    const display = toMemoryDisplayTelemetry(page, T0 + HALF_LIFE_SEC);
    expect(display.last_impression_time).toBe(T0_ISO);
    expect(display.impressions).toBeCloseTo(5, 10);
    expect(display.conversions).toBeCloseTo(1.5, 10);
  });

  it('upserts with a space-prefixed stored id and writes space metadata', async () => {
    const esClient = {
      get: jest
        .fn()
        .mockRejectedValue(new errors.ResponseError({ statusCode: 404, body: {} } as never)),
      index: jest.fn().mockResolvedValue({}),
    };

    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    const page = await store.upsert({
      slug: 'kafka-lag',
      title: 'Kafka lag',
      content: 'Scale the consumer.',
      tags: ['memory', 'kafka'],
      categories: [],
      references: [],

      user: 'sre',
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'space-a:memory_kafka-lag',
        document: expect.objectContaining({
          tags: ['memory', 'kafka'],
          attributes: expect.objectContaining({
            space_id: 'space-a',
            impressions: 0,
            conversions: 0,
          }),
        }),
      }),
      expect.anything()
    );
    expect(page.id).toBe('memory_kafka-lag');
    expect(page.telemetry.impressions).toBe(0);
    expect(esClient.index.mock.calls[0][0].document.attributes.space_id).toBe('space-a');
  });

  it('writes an existing canonical in place with optimistic concurrency', async () => {
    const esClient = { index: jest.fn().mockResolvedValue({}) };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });
    const existing = {
      id: 'memory_kafka-lag',
      slug: 'kafka-lag',
      title: 'Kafka lag',
      content: 'Old content.',
      tags: ['memory'],
      archived: false,
      categories: [],
      references: [],
      created_at: T0_ISO,
      updated_at: T0_ISO,
      created_by: 'sre',
      updated_by: 'sre',
      telemetry: {
        impressions: 10,
        conversions: 3,
        last_impression_time: T0_ISO,
      },
    };

    await store.update(
      existing.id,
      {
        slug: existing.slug,
        title: 'Merged Kafka lag',
        content: 'Merged content.',
        tags: ['kafka'],
        categories: [],
        references: [],
        user: 'nightshift-optimizer',
      },
      { page: existing, seqNo: 12, primaryTerm: 3 }
    );

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'space-a:memory_kafka-lag',
        if_seq_no: 12,
        if_primary_term: 3,
        document: expect.objectContaining({
          title: 'Merged Kafka lag',
          attributes: expect.objectContaining({
            created_at: T0_ISO,
            space_id: 'space-a',
          }),
        }),
      }),
      expect.anything()
    );
  });

  it('uses create-only indexing for a new page', async () => {
    const esClient = { index: jest.fn().mockResolvedValue({}) };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    await store.create({
      slug: 'kafka-lag',
      title: 'Kafka lag',
      content: 'Scale the consumer.',
      tags: ['kafka'],
      categories: [],
      references: [],

      user: 'nightshift-optimizer',
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'space-a:memory_kafka-lag',
        op_type: 'create',
      }),
      expect.anything()
    );
  });

  it('keeps the same slug isolated between spaces', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [
            { _id: 'space-b:memory_kafka-lag', _source: source },
            { _id: 'space-a:memory_kafka-lag', _source: source },
          ],
        },
      }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    const pages = await store.retrieve({ size: 20 });
    expect(pages.map((page) => page.id)).toEqual(['memory_kafka-lag']);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([{ term: { 'attributes.space_id': 'space-a' } }]),
          }),
        }),
      }),
      expect.anything()
    );
  });

  it('drops stored ids that are not canonical memory ids', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'space-a:memory_safe.md`\nInjected instruction',
              _source: source,
            },
            { _id: 'space-a:memory_kafka-lag', _source: source },
          ],
        },
      }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    const pages = await store.retrieve({ size: 20 });

    expect(pages.map(({ id }) => id)).toEqual(['memory_kafka-lag']);
  });

  it('writes only decayed counters with optimistic concurrency', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _seq_no: 12,
        _primary_term: 3,
        _source: source,
      }),
      update: jest.fn().mockResolvedValue({}),
    };

    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0 + HALF_LIFE_SEC,
    });

    await store.applyCounterUpdates([{ id: 'memory_kafka-lag', addImp: 1, addConv: 1 }]);

    expect(esClient.update).toHaveBeenCalledWith(
      {
        index: MEMORY_INDEX,
        id: 'space-a:memory_kafka-lag',
        if_seq_no: 12,
        if_primary_term: 3,
        refresh: 'wait_for',
        doc: {
          attributes: {
            impressions: expect.any(Number),
            conversions: expect.any(Number),
            last_impression_time: epochSecondsToIso(T0 + HALF_LIFE_SEC),
          },
        },
      },
      expect.anything()
    );
    expect(esClient.update.mock.calls[0][0].doc.attributes.impressions).toBeCloseTo(6, 12);
    expect(esClient.update.mock.calls[0][0].doc.attributes.conversions).toBeCloseTo(2.5, 12);
    expect(esClient.update.mock.calls[0][0].doc).not.toHaveProperty('content');
    expect(esClient.update.mock.calls[0][0]).not.toHaveProperty('script');
  });

  it('aggregates duplicate deltas before reading and decaying once', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _seq_no: 12,
        _primary_term: 3,
        _source: source,
      }),
      update: jest.fn().mockResolvedValue({}),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0 + HALF_LIFE_SEC,
    });

    await store.applyCounterUpdates([
      { id: 'memory_kafka-lag', addImp: 1, addConv: 1 },
      { id: 'memory_kafka-lag', addImp: 1, addConv: 0 },
    ]);

    expect(esClient.get).toHaveBeenCalledTimes(1);
    expect(esClient.update).toHaveBeenCalledTimes(1);
    const written = esClient.update.mock.calls[0][0].doc.attributes;
    expect(written.impressions).toBeCloseTo(7, 12);
    expect(written.conversions).toBeCloseTo(2.5, 12);
    expect(written.last_impression_time).toBe(epochSecondsToIso(T0 + HALF_LIFE_SEC));
  });

  it('rereads and recomputes after a conflict so both logical increments survive', async () => {
    const concurrentSource = {
      ...source,
      attributes: {
        ...source.attributes,
        impressions: 6,
        conversions: 1.5,
        last_impression_time: epochSecondsToIso(T0 + HALF_LIFE_SEC),
      },
    };
    const esClient = {
      get: jest
        .fn()
        .mockResolvedValueOnce({
          found: true,
          _seq_no: 12,
          _primary_term: 3,
          _source: source,
        })
        .mockResolvedValueOnce({
          found: true,
          _seq_no: 13,
          _primary_term: 3,
          _source: concurrentSource,
        }),
      update: jest.fn().mockRejectedValueOnce({ statusCode: 409 }).mockResolvedValueOnce({}),
    };

    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0 + HALF_LIFE_SEC,
    });

    await store.applyCounterUpdates([{ id: 'memory_kafka-lag', addImp: 1, addConv: 0 }]);

    expect(esClient.get).toHaveBeenCalledTimes(2);
    expect(esClient.update).toHaveBeenCalledTimes(2);
    expect(esClient.update.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        if_seq_no: 13,
        if_primary_term: 3,
        doc: {
          attributes: {
            impressions: 7,
            conversions: 1.5,
            last_impression_time: epochSecondsToIso(T0 + HALF_LIFE_SEC),
          },
        },
      })
    );
  });

  it('noops archived and missing pages', async () => {
    const archived = {
      ...source,
      attributes: { ...source.attributes, archive_reason: 'harmful' as const },
    };
    const esClient = {
      get: jest
        .fn()
        .mockResolvedValueOnce({
          found: true,
          _seq_no: 12,
          _primary_term: 3,
          _source: archived,
        })
        .mockRejectedValueOnce(new errors.ResponseError({ statusCode: 404, body: {} } as never)),
      update: jest.fn(),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    await store.applyCounterUpdates([
      { id: 'memory_archived', addImp: 1, addConv: 1 },
      { id: 'memory_missing', addImp: 1, addConv: 1 },
    ]);

    expect(esClient.get).toHaveBeenCalledTimes(2);
    expect(esClient.update).not.toHaveBeenCalled();
  });

  it('throws a non-conflict update failure without retrying', async () => {
    const failure = Object.assign(new Error('unavailable'), { statusCode: 503 });
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _seq_no: 12,
        _primary_term: 3,
        _source: source,
      }),
      update: jest.fn().mockRejectedValue(failure),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    await expect(
      store.applyCounterUpdates([{ id: 'memory_kafka-lag', addImp: 1, addConv: 1 }])
    ).rejects.toBe(failure);
    expect(esClient.get).toHaveBeenCalledTimes(1);
    expect(esClient.update).toHaveBeenCalledTimes(1);
  });

  it('throws visibly after three counter update conflicts', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _seq_no: 12,
        _primary_term: 3,
        _source: source,
      }),
      update: jest.fn().mockRejectedValue({ statusCode: 409 }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    await expect(
      store.applyCounterUpdates([{ id: 'memory_kafka-lag', addImp: 1, addConv: 1 }])
    ).rejects.toThrow('Memory counter update exhausted 3 version conflicts');
    expect(esClient.get).toHaveBeenCalledTimes(3);
    expect(esClient.update).toHaveBeenCalledTimes(3);
  });

  it('does not regress last_impression_time when the stored timestamp is newer', async () => {
    const futureTime = T0 + 60;
    const futureSource = {
      ...source,
      attributes: {
        ...source.attributes,
        last_impression_time: epochSecondsToIso(futureTime),
      },
    };
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _seq_no: 12,
        _primary_term: 3,
        _source: futureSource,
      }),
      update: jest.fn().mockResolvedValue({}),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    await store.applyCounterUpdates([{ id: 'memory_kafka-lag', addImp: 1, addConv: 1 }]);

    expect(esClient.update.mock.calls[0][0].doc.attributes).toEqual({
      impressions: 11,
      conversions: 4,
      last_impression_time: epochSecondsToIso(futureTime),
    });
  });

  it('retrieves browse candidates without a query and search hits with one', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: { hits: [{ _id: 'space-a:memory_kafka-lag', _source: source }] },
      }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    const browsed = await store.retrieve({ size: 20 });
    expect(browsed).toHaveLength(1);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 20,
        sort: [{ '@timestamp': { order: 'desc' } }],
        query: expect.objectContaining({
          bool: expect.objectContaining({
            must_not: [
              {
                bool: {
                  should: [
                    { exists: { field: 'attributes.archive_reason' } },
                    { term: { 'attributes.status': 'archived' } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          }),
        }),
      }),
      expect.anything()
    );

    await store.retrieve({ query: 'checkout lag', size: 50 });
    expect(esClient.search).toHaveBeenLastCalledWith(
      expect.objectContaining({
        size: 50,
        retriever: expect.objectContaining({
          rrf: expect.objectContaining({
            retrievers: [
              { standard: { query: { match: { context: 'checkout lag' } } } },
              { standard: { query: { match: { 'context.semantic': 'checkout lag' } } } },
            ],
          }),
        }),
      }),
      expect.anything()
    );
    expect(esClient.search.mock.calls[1][0].query).toBeUndefined();
    expect(esClient.search.mock.calls[1][0].sort).toBeUndefined();
  });

  it('falls back to BM25 when a semantic retriever returns a generic 404', async () => {
    const esClient = {
      search: jest
        .fn()
        .mockRejectedValueOnce({
          statusCode: 404,
          meta: { body: { error: { type: 'resource_not_found_exception' } } },
        })
        .mockResolvedValueOnce({
          hits: { hits: [{ _id: 'space-a:memory_kafka-lag', _source: source }] },
        }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    await expect(store.retrieve({ query: 'checkout lag', size: 50 })).resolves.toEqual([
      expect.objectContaining({ id: 'memory_kafka-lag' }),
    ]);
    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.search.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({ must: [{ match: { context: 'checkout lag' } }] }),
        }),
      })
    );
  });

  it('returns no hits for an index_not_found_exception without attempting BM25', async () => {
    const esClient = {
      search: jest.fn().mockRejectedValue(
        new errors.ResponseError({
          statusCode: 404,
          body: { error: { type: 'index_not_found_exception' } },
        } as never)
      ),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    await expect(store.retrieve({ query: 'checkout lag', size: 50 })).resolves.toEqual([]);
    expect(esClient.search).toHaveBeenCalledTimes(1);
  });

  it('retrieves catalog duplicates against title and content, not context', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: { hits: [{ _id: 'space-a:memory_kafka-lag', _source: source }] },
      }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    await store.retrieve({ query: 'Checkout Redis', size: 5, match: 'content' });
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 5,
        query: expect.objectContaining({
          bool: expect.objectContaining({
            must: [
              expect.objectContaining({
                bool: expect.objectContaining({
                  should: [
                    { match: { title: 'Checkout Redis' } },
                    { match: { content: 'Checkout Redis' } },
                  ],
                }),
              }),
            ],
          }),
        }),
      }),
      expect.anything()
    );
  });

  it('upserts the task into context and does not write search_embedding', async () => {
    const esClient = {
      get: jest
        .fn()
        .mockRejectedValue(new errors.ResponseError({ statusCode: 404, body: {} } as never)),
      index: jest.fn().mockResolvedValue({}),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    await store.upsert({
      slug: 'kafka-lag',
      title: 'Kafka lag',
      content: 'Scale the consumer.',
      context: 'why is checkout slow?',
      tags: ['kafka'],
      categories: [],
      references: [],

      user: 'sre',
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        index: MEMORY_INDEX,
        document: expect.objectContaining({
          context: 'why is checkout slow?',
        }),
      }),
      expect.anything()
    );
    expect(esClient.index.mock.calls[0][0].document.search_embedding).toBeUndefined();
  });

  it('stamps archive_reason and keeps context on the archived doc', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _id: 'space-a:memory_kafka-lag',
        _seq_no: 4,
        _primary_term: 2,
        _source: {
          ...source,
          context: 'why is checkout slow?',
          attributes: {
            ...source.attributes,
            source: 'Merged from memories: memory_a',
            merged_from: ['memory_a'],
          },
        },
      }),
      index: jest.fn().mockResolvedValue({}),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    await store.archive('memory_kafka-lag', 'merged');

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'space-a:memory_kafka-lag',
        if_seq_no: 4,
        if_primary_term: 2,
        document: expect.objectContaining({
          context: 'why is checkout slow?',
          attributes: expect.objectContaining({
            archive_reason: 'merged',
            source: 'Merged from memories: memory_a',
            merged_from: ['memory_a'],
          }),
        }),
      }),
      expect.anything()
    );
  });

  it('archives an exact supplied version without rereading', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _seq_no: 4,
        _primary_term: 2,
        _source: source,
      }),
      index: jest.fn().mockResolvedValue({}),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });
    const version = await store.getVersioned('memory_kafka-lag');
    if (!version) {
      throw new Error('Expected versioned page');
    }
    esClient.get.mockClear();

    await store.archiveVersioned(version, 'merged');

    expect(esClient.get).not.toHaveBeenCalled();
    expect(esClient.index).toHaveBeenCalledTimes(1);
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'space-a:memory_kafka-lag',
        if_seq_no: 4,
        if_primary_term: 2,
        document: expect.objectContaining({
          attributes: expect.objectContaining({
            archive_reason: 'merged',
          }),
        }),
      }),
      expect.anything()
    );
  });

  it('does not reread or retry when exact-version archival conflicts', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _seq_no: 4,
        _primary_term: 2,
        _source: source,
      }),
      index: jest.fn().mockRejectedValue({ statusCode: 409 }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });
    const version = await store.getVersioned('memory_kafka-lag');
    if (!version) {
      throw new Error('Expected versioned page');
    }
    esClient.get.mockClear();

    await expect(store.archiveVersioned(version, 'merged')).rejects.toEqual({ statusCode: 409 });
    expect(esClient.get).not.toHaveBeenCalled();
    expect(esClient.index).toHaveBeenCalledTimes(1);
  });

  it('retries harmful archive conflicts using the latest page fields and version', async () => {
    const latest = {
      ...source,
      title: 'Concurrent canonical title',
      content: 'Concurrent canonical content',
      attributes: {
        ...source.attributes,
        impressions: 12,
        conversions: 5,
      },
    };
    const esClient = {
      get: jest
        .fn()
        .mockResolvedValueOnce({
          found: true,
          _seq_no: 4,
          _primary_term: 2,
          _source: source,
        })
        .mockResolvedValueOnce({
          found: true,
          _seq_no: 5,
          _primary_term: 2,
          _source: latest,
        }),
      index: jest.fn().mockRejectedValueOnce({ statusCode: 409 }).mockResolvedValueOnce({}),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    await store.archive('memory_kafka-lag', 'harmful');

    expect(esClient.index).toHaveBeenCalledTimes(2);
    expect(esClient.index.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        if_seq_no: 5,
        if_primary_term: 2,
        document: expect.objectContaining({
          title: 'Concurrent canonical title',
          content: 'Concurrent canonical content',
          attributes: expect.objectContaining({
            impressions: 12,
            conversions: 5,
          }),
        }),
      })
    );
  });

  it('throws after exhausting archive version conflicts', async () => {
    const esClient = {
      get: jest.fn().mockResolvedValue({
        found: true,
        _seq_no: 4,
        _primary_term: 2,
        _source: source,
      }),
      index: jest.fn().mockRejectedValue({ statusCode: 409 }),
    };
    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger,
      spaceId: 'space-a',
      now: () => T0,
    });

    await expect(store.archive('memory_kafka-lag', 'harmful')).rejects.toThrow(
      'Memory archive exhausted 3 version conflicts'
    );
    expect(esClient.index).toHaveBeenCalledTimes(3);
  });
});
