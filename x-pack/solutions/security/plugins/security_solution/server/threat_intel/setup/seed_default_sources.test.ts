/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { GLOBAL_SPACE_ID, CATALOG_SOURCE_URLS } from '../../../common/threat_intel';
import {
  DEFAULT_SOURCES,
  LEGACY_SOURCE_DISABLE_PAGE_SIZE,
  seedDefaultSources,
} from './seed_default_sources';

const TOTAL = DEFAULT_SOURCES.length;

const missingDocuments = (): Array<Record<string, unknown>> =>
  DEFAULT_SOURCES.map(({ id }) => ({ _id: id, _index: 'sources', found: false }));

const storedDocument = (
  source: (typeof DEFAULT_SOURCES)[number],
  overrides: Record<string, unknown> = {}
) => ({
  _id: source.id,
  _index: 'sources',
  found: true,
  _seq_no: 7,
  _primary_term: 3,
  _source: {
    adapter_type: source.adapter_type,
    name: source.name,
    enabled: source.enabled,
    tags: source.tags,
    space_id: GLOBAL_SPACE_ID,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  },
});

const currentDocuments = () => DEFAULT_SOURCES.map((source) => storedDocument(source));

const successfulBulkResponse = (operations: Array<Record<string, unknown>>) => ({
  errors: false,
  items: operations
    .filter((_operation, index) => index % 2 === 0)
    .map((operation) =>
      'create' in operation ? { create: { result: 'created' } } : { index: { result: 'updated' } }
    ),
});

const run = async ({
  documents = missingDocuments(),
  bulkImpl = successfulBulkResponse,
}: {
  documents?: Array<Record<string, unknown>>;
  bulkImpl?: (operations: Array<Record<string, unknown>>) => unknown;
} = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.mget.mockResolvedValue({ docs: documents } as never);
  esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
  esClient.update.mockResolvedValue({} as never);
  esClient.bulk.mockImplementation((async ({
    operations,
  }: {
    operations?: Array<Record<string, unknown>>;
  }) => bulkImpl(operations ?? [])) as never);
  const logger = loggingSystemMock.createLogger();
  const result = await seedDefaultSources({ esClient, logger });
  return { esClient, logger, result };
};

describe('DEFAULT_SOURCES approved catalog', () => {
  const ENABLED_ENDPOINTS: Record<string, string> = {
    'kev:cisa-known-exploited-vulnerabilities':
      'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
    'vendor_api:elastic-security-labs': 'https://www.elastic.co/security-labs/rss/feed.xml',
    'rss:mandiant-research': 'https://cloud.google.com/security/blog/threat-intelligence/rss',
    'rss:unit42': 'https://unit42.paloaltonetworks.com/feed/',
    'rss:talos': 'https://blog.talosintelligence.com/rss/',
    'rss:crowdstrike': 'https://www.crowdstrike.com/blog/feed/',
    'rss:cisa-alerts': 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
    'text_indicator_list:maltrail-cobaltstrike':
      'https://raw.githubusercontent.com/stamparm/maltrail/master/trails/static/malware/cobaltstrike.txt',
  };

  const DISABLED_ENDPOINTS: Record<string, string> = {
    'rss:aws-security': 'https://aws.amazon.com/blogs/security/feed/',
    'rss:aws-security-bulletins': 'https://aws.amazon.com/security/security-bulletins/rss/feed/',
    'rss:fortiguard-advisories': 'https://filestore.fortinet.com/fortiguard/rss/ir.xml',
    'rss:fortiguard-threat-signal':
      'https://filestore.fortinet.com/fortiguard/rss/threatsignal.xml',
  };

  it('contains only the twelve approved source IDs and URLs', () => {
    expect(CATALOG_SOURCE_URLS).toEqual({
      ...ENABLED_ENDPOINTS,
      ...DISABLED_ENDPOINTS,
    });
  });

  it('ships exactly eight sources enabled', () => {
    expect(DEFAULT_SOURCES.filter(({ enabled }) => enabled)).toHaveLength(8);
  });

  it('ships exactly four sources disabled', () => {
    expect(DEFAULT_SOURCES.filter(({ enabled }) => !enabled)).toHaveLength(4);
  });

  it('dispatches Elastic Security Labs through the RSS adapter while preserving its stable ID', () => {
    expect(
      DEFAULT_SOURCES.find(({ id }) => id === 'vendor_api:elastic-security-labs')?.adapter_type
    ).toBe('rss');
  });
});

describe('seedDefaultSources', () => {
  it('creates every missing source by stable ID', async () => {
    const { esClient, result } = await run();
    const operations = esClient.bulk.mock.calls[0][0].operations as Array<
      Record<string, { _id?: string }>
    >;
    const ids = operations.filter((operation) => operation.create).map(({ create }) => create._id);

    expect({ result, ids }).toEqual({
      result: { total: TOTAL, created: TOTAL, updated: 0, skipped: 0, failed: 0 },
      ids: DEFAULT_SOURCES.map(({ id }) => id),
    });
  });

  it('does not write when every catalog-owned field is current', async () => {
    const { esClient, result } = await run({ documents: currentDocuments() });

    expect({ bulkCalls: esClient.bulk.mock.calls.length, result }).toEqual({
      bulkCalls: 0,
      result: { total: TOTAL, created: 0, updated: 0, skipped: TOTAL, failed: 0 },
    });
  });

  it('reconciles code-owned fields while preserving enabled and created_at', async () => {
    const elastic = DEFAULT_SOURCES.find(({ id }) => id === 'vendor_api:elastic-security-labs');
    if (!elastic) throw new Error('Elastic Security Labs source is missing');
    const documents = currentDocuments().map((document) =>
      document._id === elastic.id
        ? storedDocument(elastic, {
            adapter_type: 'vendor_api',
            name: 'Old name',
            enabled: false,
            config: { url: 'https://old.example.test/feed.xml' },
            tags: ['old'],
            created_at: '2025-01-02T03:04:05.000Z',
          })
        : document
    );

    const { esClient, result } = await run({ documents });
    const operations = esClient.bulk.mock.calls[0][0].operations as Array<Record<string, unknown>>;

    expect({ result, action: operations[0], document: operations[1] }).toEqual({
      result: { total: TOTAL, created: 0, updated: 1, skipped: TOTAL - 1, failed: 0 },
      action: {
        index: {
          _index: '.kibana-threat-intel-sources',
          _id: elastic.id,
          if_seq_no: 7,
          if_primary_term: 3,
        },
      },
      document: expect.objectContaining({
        adapter_type: 'rss',
        name: 'Elastic Security Labs',
        enabled: false,
        tags: ['vendor', 'elastic', 'research', 'research-tools'],
        created_at: '2025-01-02T03:04:05.000Z',
      }),
    });
    expect(operations[1]).not.toHaveProperty('config');
  });

  it('strips legacy config from otherwise current catalog rows', async () => {
    const elastic = DEFAULT_SOURCES.find(({ id }) => id === 'vendor_api:elastic-security-labs');
    if (!elastic) throw new Error('Elastic Security Labs source is missing');
    const documents = currentDocuments().map((document) =>
      document._id === elastic.id
        ? storedDocument(elastic, {
            config: { url: 'https://old.example.test/feed.xml' },
          })
        : document
    );

    const { esClient, result } = await run({ documents });
    const written = esClient.bulk.mock.calls[0][0].operations?.[1] as Record<string, unknown>;

    expect(result.updated).toBe(1);
    expect(written).not.toHaveProperty('config');
  });

  it('repairs missing operator-owned fields from catalog defaults', async () => {
    const first = DEFAULT_SOURCES[0];
    const documents = currentDocuments().map((document) =>
      document._id === first.id
        ? storedDocument(first, { enabled: undefined, created_at: undefined })
        : document
    );

    const { esClient } = await run({ documents });
    const written = esClient.bulk.mock.calls[0][0].operations?.[1] as Record<string, unknown>;

    expect(written).toEqual(
      expect.objectContaining({ enabled: first.enabled, created_at: expect.any(String) })
    );
  });

  it('treats a concurrent create conflict as already reconciled', async () => {
    const { result } = await run({
      bulkImpl: (operations) => ({
        errors: true,
        items: operations
          .filter((_operation, index) => index % 2 === 0)
          .map(() => ({ create: { error: { status: 409 } } })),
      }),
    });

    expect(result).toEqual({
      total: TOTAL,
      created: 0,
      updated: 0,
      skipped: TOTAL,
      failed: 0,
    });
  });

  it('reports a concurrent update conflict as failed so bootstrap retries', async () => {
    const first = DEFAULT_SOURCES[0];
    const documents = currentDocuments().map((document) =>
      document._id === first.id ? storedDocument(first, { name: 'Stale name' }) : document
    );
    const { result } = await run({
      documents,
      bulkImpl: () => ({
        errors: true,
        items: [{ index: { error: { type: 'version_conflict_engine_exception' } } }],
      }),
    });

    expect(result.failed).toBe(1);
  });

  it('reports every pending action as failed when the bulk request rejects', async () => {
    const { result } = await run({
      bulkImpl: () => {
        throw new Error('cluster_block_exception');
      },
    });

    expect(result.failed).toBe(TOTAL);
  });

  it('propagates a catalog read failure so bootstrap retries it', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.mget.mockRejectedValue(new Error('read timeout'));

    await expect(
      seedDefaultSources({ esClient, logger: loggingSystemMock.createLogger() })
    ).rejects.toThrow('read timeout');
  });

  it('propagates an item-level catalog read failure instead of treating it as missing', async () => {
    const documents = missingDocuments();
    documents[0] = {
      _id: DEFAULT_SOURCES[0].id,
      _index: 'sources',
      error: { type: 'no_shard_available_action_exception' },
    };

    await expect(run({ documents })).rejects.toThrow(/Catalog read failed/);
  });

  it('logs a changed catalog at info', async () => {
    const { logger } = await run();

    expect(logger.info).toHaveBeenCalledWith(
      `Default source reconciliation finished: ${TOTAL} created, 0 updated, 0 unchanged, 0 failed`
    );
  });

  it('pages through all enabled legacy sources with search_after', async () => {
    const firstPage = Array.from({ length: LEGACY_SOURCE_DISABLE_PAGE_SIZE }, (_, index) => ({
      _id: `legacy:page1-${index}`,
      sort: [`legacy:page1-${index}`],
      _source: { enabled: true },
    }));
    const secondPage = [
      {
        _id: 'legacy:page2-0',
        sort: ['legacy:page2-0'],
        _source: { enabled: true },
      },
    ];

    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.mget.mockResolvedValue({ docs: currentDocuments() } as never);
    esClient.search
      .mockResolvedValueOnce({ hits: { hits: firstPage } } as never)
      .mockResolvedValueOnce({ hits: { hits: secondPage } } as never);
    esClient.update.mockResolvedValue({} as never);

    const result = await seedDefaultSources({
      esClient,
      logger: loggingSystemMock.createLogger(),
    });

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.search.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        search_after: ['legacy:page1-999'],
      })
    );
    expect(esClient.update).toHaveBeenCalledTimes(LEGACY_SOURCE_DISABLE_PAGE_SIZE + 1);
    expect(result.updated).toBe(LEGACY_SOURCE_DISABLE_PAGE_SIZE + 1);
    expect(result.failed).toBe(0);
  });

  it('counts a failed legacy-source disable so bootstrap can retry', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.mget.mockResolvedValue({ docs: currentDocuments() } as never);
    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          { _id: 'legacy:custom-feed', sort: ['legacy:custom-feed'], _source: { enabled: true } },
        ],
      },
    } as never);
    esClient.update.mockRejectedValue(new Error('version_conflict_engine_exception'));

    const result = await seedDefaultSources({
      esClient,
      logger: loggingSystemMock.createLogger(),
    });

    expect(result.updated).toBe(0);
    expect(result.failed).toBe(1);
  });
});
