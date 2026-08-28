/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { DEFAULT_SOURCES, seedDefaultSources } from './seed_default_sources';

/**
 * The counts this returns drive bootstrap's retry decision: a non-zero `failed` makes
 * `seedThreatIntelCatalog` throw so the whole seed is retried. So reporting a failed
 * create as skipped, or vice versa, either hides missing default sources for the
 * lifetime of the process or retries forever. The bootstrap suite mocks this module
 * out, so none of that accounting was covered.
 */
const TOTAL = DEFAULT_SOURCES.length;

const run = async (bulkImpl: unknown) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  (esClient.bulk as unknown as jest.Mock).mockImplementation(bulkImpl as never);
  const logger = loggingSystemMock.createLogger();
  const result = await seedDefaultSources({ esClient, logger });
  return { esClient, result, logger };
};

/** Bulk response where every item takes the same shape. */
const itemsFor = (operations: unknown[], item: Record<string, unknown>) => {
  // Two entries per document: the action line and the source.
  const count = (operations as unknown[]).length / 2;
  return {
    errors: Object.keys(item)[0] === 'error',
    items: Array.from({ length: count }, () => ({ create: item })),
  };
};

/**
 * Seeding runs on every boot and the steady state is every source conflicting, so an
 * unconditional info log reports `0 created, N skipped` forever. bootstrap downgrades the
 * all-conflicts *result* to debug, but that cannot suppress a log this function already
 * emitted, so the level has to be decided here.
 */
describe('seedDefaultSources completion log level', () => {
  const summaryOf = (calls: unknown[][]) =>
    calls.map(([msg]) => String(msg)).filter((msg) => msg.startsWith('Default source seeding'));

  it('logs the steady state at debug, not info', async () => {
    const { logger } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { error: { status: 409 } })
    );

    expect(summaryOf(logger.info.mock.calls)).toEqual([]);
    expect(summaryOf(logger.debug.mock.calls)).toEqual([
      `Default source seeding finished: 0 created, ${TOTAL} skipped, 0 failed`,
    ]);
  });

  it('logs at info when sources were actually created', async () => {
    const { logger } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { result: 'created' })
    );

    expect(summaryOf(logger.info.mock.calls)).toEqual([
      `Default source seeding finished: ${TOTAL} created, 0 skipped, 0 failed`,
    ]);
  });

  it('logs at info when a source failed', async () => {
    const { logger } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { error: { type: 'mapper_parsing_exception' } })
    );

    expect(summaryOf(logger.info.mock.calls)).toEqual([
      `Default source seeding finished: 0 created, 0 skipped, ${TOTAL} failed`,
    ]);
  });
});

describe('seedDefaultSources', () => {
  it('counts every created document', async () => {
    const { result } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { result: 'created' })
    );

    expect(result).toEqual({ total: TOTAL, created: TOTAL, skipped: 0, failed: 0 });
  });

  // The idempotency contract. Seeding runs on every boot, so the steady state is every
  // document conflicting, and that must not read as failure or bootstrap retries forever.
  it.each([
    ['version_conflict_engine_exception by type', { type: 'version_conflict_engine_exception' }],
    ['a 409 status', { status: 409 }],
  ])('treats %s as already present, not a failure', async (_label, error) => {
    const { result } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { error })
    );

    expect(result.skipped).toBe(TOTAL);
    expect(result.failed).toBe(0);
    expect(result.created).toBe(0);
  });

  // A non-conflict item error has to surface as failed, because that is what makes
  // bootstrap retry rather than resolving readiness with sources missing.
  it('counts a non-conflict item error as failed', async () => {
    const { result } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { error: { type: 'strict_dynamic_mapping_exception' } })
    );

    expect(result.failed).toBe(TOTAL);
    expect(result.skipped).toBe(0);
  });

  it('counts a missing create action on an item as failed', async () => {
    const { result } = await run(async ({ operations }: { operations: unknown[] }) => ({
      errors: true,
      items: Array.from({ length: (operations as unknown[]).length / 2 }, () => ({})),
    }));

    expect(result.failed).toBe(TOTAL);
  });

  it('counts every document in the chunk as failed when the whole bulk rejects', async () => {
    const { result } = await run(async () => {
      throw new Error('cluster_block_exception');
    });

    expect(result.failed).toBe(TOTAL);
    expect(result.created).toBe(0);
  });

  it('reports a mixed outcome accurately', async () => {
    const { result } = await run(async ({ operations }: { operations: unknown[] }) => {
      const count = (operations as unknown[]).length / 2;
      return {
        errors: true,
        items: Array.from({ length: count }, (_v, i) => {
          if (i === 0) return { create: { result: 'created' } };
          if (i === 1) return { create: { error: { type: 'version_conflict_engine_exception' } } };
          return { create: { error: { type: 'illegal_argument_exception' } } };
        }),
      };
    });

    expect(result.created).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(TOTAL - 2);
    expect(result.created + result.skipped + result.failed).toBe(TOTAL);
  });

  it('creates by stable id so a re-run cannot duplicate', async () => {
    const { esClient } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { result: 'created' })
    );

    const operations = (esClient.bulk as unknown as jest.Mock).mock.calls[0][0].operations as Array<
      Record<string, { _id?: string }>
    >;
    const ids = operations.filter((op) => op.create).map((op) => op.create._id);

    expect(ids).toHaveLength(TOTAL);
    expect(new Set(ids).size).toBe(TOTAL);
    expect(ids.every(Boolean)).toBe(true);
  });

  it('does not force a refresh, since nothing reads the catalog synchronously after', async () => {
    const { esClient } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { result: 'created' })
    );

    expect((esClient.bulk as unknown as jest.Mock).mock.calls[0][0].refresh).toBe(false);
  });

  it('accounts for every document exactly once', async () => {
    const { result } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { result: 'created' })
    );

    expect(result.created + result.skipped + result.failed).toBe(result.total);
  });
});

/**
 * The approved MVP catalog contract. These assertions are load-bearing: the eight
 * enabled defaults, the four disabled optional-pack entries, their exact ids and
 * endpoints, and the fact that an operator's enablement choice survives a re-seed
 * are the product decision, not implementation detail.
 */
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

  const byId = (id: string) => DEFAULT_SOURCES.find((source) => source.id === id);

  it('seeds exactly eight enabled sources by default', () => {
    const enabled = DEFAULT_SOURCES.filter((source) => source.enabled);
    expect(enabled.map((source) => source.id).sort()).toEqual(
      Object.keys(ENABLED_ENDPOINTS).sort()
    );
  });

  it('seeds exactly four disabled optional-pack sources', () => {
    const disabled = DEFAULT_SOURCES.filter((source) => !source.enabled);
    expect(disabled.map((source) => source.id).sort()).toEqual(
      Object.keys(DISABLED_ENDPOINTS).sort()
    );
  });

  it('carries no sources beyond the approved twelve', () => {
    expect(DEFAULT_SOURCES).toHaveLength(12);
    expect(new Set(DEFAULT_SOURCES.map((source) => source.id)).size).toBe(12);
  });

  it.each(Object.entries(ENABLED_ENDPOINTS))(
    'pins the enabled source %s to its approved endpoint',
    (id, url) => {
      const source = byId(id);
      expect(source?.enabled).toBe(true);
      expect(source?.config.url).toBe(url);
    }
  );

  it.each(Object.entries(DISABLED_ENDPOINTS))(
    'pins the disabled source %s to its approved endpoint',
    (id, url) => {
      const source = byId(id);
      expect(source?.enabled).toBe(false);
      expect(source?.config.url).toBe(url);
    }
  );

  it('groups the disabled entries into an AWS pack and a FortiGuard pack that do not overlap', () => {
    const awsPack = DEFAULT_SOURCES.filter((source) => source.tags.includes('pack:aws-iam'));
    const fortiPack = DEFAULT_SOURCES.filter((source) => source.tags.includes('pack:fortigate'));

    expect(awsPack.map((source) => source.id).sort()).toEqual([
      'rss:aws-security',
      'rss:aws-security-bulletins',
    ]);
    expect(fortiPack.map((source) => source.id).sort()).toEqual([
      'rss:fortiguard-advisories',
      'rss:fortiguard-threat-signal',
    ]);
    expect(awsPack.every((source) => !source.enabled)).toBe(true);
    expect(fortiPack.every((source) => !source.enabled)).toBe(true);
  });
});

/**
 * Create-only seeding is what lets an operator's enable / disable choice survive a
 * later boot: a re-seed can only insert a missing id, never overwrite the stored
 * `enabled` value of one that already exists.
 */
describe('seedDefaultSources preserves operator-selected enabled state', () => {
  it('writes each declared enabled state on first seed', async () => {
    const { esClient } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { result: 'created' })
    );

    const operations = (esClient.bulk as unknown as jest.Mock).mock.calls[0][0].operations as Array<
      Record<string, unknown>
    >;

    const documentsById = new Map<string, { enabled: boolean }>();
    for (let i = 0; i < operations.length; i += 2) {
      const action = operations[i] as { create?: { _id?: string } };
      const document = operations[i + 1] as { enabled: boolean };
      if (action.create?._id) documentsById.set(action.create._id, document);
    }

    for (const source of DEFAULT_SOURCES) {
      expect(documentsById.get(source.id)?.enabled).toBe(source.enabled);
    }
  });

  it('only ever issues create operations, so a re-seed cannot overwrite an operator toggle', async () => {
    const { esClient } = await run(async ({ operations }: { operations: unknown[] }) =>
      itemsFor(operations, { error: { status: 409 } })
    );

    const operations = (esClient.bulk as unknown as jest.Mock).mock.calls[0][0].operations as Array<
      Record<string, unknown>
    >;
    const actions = operations.filter((_op, index) => index % 2 === 0);

    expect(actions.every((action) => 'create' in action)).toBe(true);
    expect(actions.some((action) => 'index' in action || 'update' in action)).toBe(false);
  });
});
