/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, ToolHandlerContext } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core/server';

import type { ExtractionBatchStatus } from '../../../common/extraction_batch';
import type { RepositorySettings } from '../../../common/repository_settings';
import { ElasticsearchCatalogWriter } from '../../adapters/elasticsearch_catalog';
import { ElasticsearchFindingsWriter } from '../../adapters/elasticsearch_findings';
import { ExtractionAlreadyRunningError } from '../../extraction_already_running_error';
import { ExtractionCapacityExhaustedError } from '../../extraction_capacity_exhausted_error';
import type { ExtractionService } from '../../extraction_service';
import type { RouteServices } from '../../routes';
import { SourceUnavailableError } from '../../source_session';
import { createGetExtractionStatusTool } from './get_extraction_status';
import { createGetFindingTool } from './get_finding';
import { createListRepositoriesTool } from './list_repositories';
import { MAX_SEARCH_CATALOG_PER_PAGE, createSearchCatalogTool } from './search_catalog';
import { createSearchFindingsTool } from './search_findings';
import { createStartExtractionTool } from './start_extraction';
import { createUpdateFindingStatusTool } from './update_finding_status';
import type { CodeIntelligenceToolDependencies } from './types';
import { createUpsertRepositoryTool } from './upsert_repository';

const settings = (repository: string, extra: Partial<RepositorySettings> = {}) => ({
  repository,
  remoteUrl: `https://github.com/${repository}.git`,
  defaultRef: 'HEAD',
  enabled: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...extra,
});

const catalogHit = {
  _id: 'entry-1',
  _source: {
    repository: 'grafana/loki',
    revision: '0123456789abcdef0123456789abcdef01234567',
    signal_type: 'log',
    title: 'Ingester flush failed',
    description: 'Logged when a chunk flush fails.',
    query: 'FROM logs-* | WHERE message LIKE "flush failed*" | LIMIT 10',
    evidence: [{ path: 'pkg/ingester/flush.go', line: 42, excerpt: 'level.Error(log).Log(...)' }],
    severity_score: 80,
    validation: { status: 'valid', diagnostics: [] },
    source_hash: 'abc',
    updated_at: '2026-09-30T10:00:00.000Z',
  },
};

/** Answers the settings list, catalog summary, and catalog search calls the tools make. */
const fakeClient = ({
  stored = [] as Array<ReturnType<typeof settings>>,
  buckets = [] as unknown[],
  hits = [] as unknown[],
} = {}) => ({
  indices: { exists: jest.fn(async () => true), create: jest.fn() },
  search: jest.fn(async (request: { index: string; aggs?: unknown }) => {
    if (request.aggs !== undefined) return { aggregations: { repositories: { buckets } } };
    if (request.index === 'settings') {
      return {
        hits: { hits: stored.map((source) => ({ _id: source.repository, _source: source })) },
      };
    }
    return { hits: { total: { value: hits.length }, hits } };
  }),
  get: jest.fn(async () => ({ found: false })),
  update: jest.fn(async () => ({})),
  index: jest.fn(async () => ({})),
});

const request = {} as KibanaRequest;

const context = (client: ReturnType<typeof fakeClient>) =>
  ({
    esClient: { asCurrentUser: client },
    request,
    spaceId: 'space-a',
  } as unknown as ToolHandlerContext);

const dependencies = (services: Partial<RouteServices> = {}): CodeIntelligenceToolDependencies => ({
  catalogIndex: 'catalog',
  findingsIndex: 'findings',
  settingsIndex: 'settings',
  getServices: () => ({ getSpaceId: () => 'default', ...services }),
});

const run = async <T extends BuiltinToolDefinition>(
  tool: T,
  args: Record<string, unknown>,
  client = fakeClient()
): Promise<ToolResult[]> => {
  const result = await tool.handler(args, context(client));
  if (!('results' in result)) throw new Error('The tool returned no results.');
  return result.results as ToolResult[];
};

describe('list_repositories', () => {
  it('lists each repository with its catalog counts', async () => {
    const client = fakeClient({
      stored: [
        settings('grafana/loki', { githubConnectorId: 'github' }),
        settings('redis/redis', { enabled: false }),
      ],
      buckets: [
        {
          key: 'grafana/loki',
          doc_count: 3,
          severities: {
            buckets: {
              low: { doc_count: 1 },
              medium: { doc_count: 0 },
              high: { doc_count: 1 },
              critical: { doc_count: 1 },
            },
          },
        },
      ],
    });

    const [result] = await run(createListRepositoriesTool(dependencies()), {}, client);

    expect(result).toEqual(
      expect.objectContaining({
        type: 'other',
        data: {
          repositories: [
            {
              repository: 'grafana/loki',
              remoteUrl: 'https://github.com/grafana/loki.git',
              defaultRef: 'HEAD',
              enabled: true,
              githubConnectorId: 'github',
              catalogEntries: { total: 3, severities: { low: 1, medium: 0, high: 1, critical: 1 } },
            },
            {
              repository: 'redis/redis',
              remoteUrl: 'https://github.com/redis/redis.git',
              defaultRef: 'HEAD',
              enabled: false,
              catalogEntries: { total: 0, severities: { low: 0, medium: 0, high: 0, critical: 0 } },
            },
          ],
        },
      })
    );
  });
});

describe('upsert_repository', () => {
  it('asks for confirmation once and stores the repository', async () => {
    const tool = createUpsertRepositoryTool(dependencies());
    const client = fakeClient();

    const [result] = await run(
      tool,
      { repository: 'owner/repo', remoteUrl: 'https://github.com/owner/repo.git' },
      client
    );

    expect(tool.confirmation?.askUser).toBe('once');
    expect(client.index).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'settings', id: 'owner/repo' })
    );
    expect(result).toEqual(
      expect.objectContaining({
        type: 'other',
        data: {
          repository: expect.objectContaining({
            repository: 'owner/repo',
            remoteUrl: 'https://github.com/owner/repo.git',
            defaultRef: 'HEAD',
            enabled: true,
          }),
        },
      })
    );
  });

  it('returns the route validation messages as an error without saving', async () => {
    const client = fakeClient();

    const [result] = await run(
      createUpsertRepositoryTool(dependencies()),
      { repository: 'owner/repo', remoteUrl: 'https://user:secret@github.com/owner/repo.git' },
      client
    );

    expect(client.index).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        type: 'error',
        data: {
          message:
            'Remote URL must be an https:// URL without a user name, password, query, or fragment.',
          metadata: { problems: [expect.objectContaining({ field: 'remoteUrl' })] },
        },
      })
    );
  });
});

describe('start_extraction', () => {
  const startWith = (start: jest.Mock) =>
    createStartExtractionTool(
      dependencies({ extractionService: { start } as unknown as ExtractionService })
    );

  it('always asks for confirmation and requires at least 1 named repository', () => {
    const tool = startWith(jest.fn());
    expect(tool.confirmation?.askUser).toBe('always');
    expect(tool.schema.safeParse({ repositories: [] }).success).toBe(false);
    expect(tool.schema.safeParse({}).success).toBe(false);
  });

  it('starts a batch for the named repositories only', async () => {
    const start = jest.fn(async () => 'batch-1');
    const client = fakeClient({
      stored: [settings('grafana/loki'), settings('redis/redis'), settings('owner/repo')],
    });

    const [result] = await run(
      startWith(start),
      { repositories: [{ repository: 'owner/repo', revision: 'main' }] },
      client
    );

    expect(start).toHaveBeenCalledWith(
      [
        {
          repository: 'owner/repo',
          revision: 'main',
          remoteUrl: 'https://github.com/owner/repo.git',
        },
      ],
      request,
      'space-a',
      {
        catalogWriter: expect.any(ElasticsearchCatalogWriter),
        findingsWriter: expect.any(ElasticsearchFindingsWriter),
      }
    );
    expect(result).toEqual(
      expect.objectContaining({
        type: 'other',
        data: { id: 'batch-1', repositories: [{ repository: 'owner/repo', revision: 'main' }] },
      })
    );
  });

  it('maps a repository missing from the settings to repository_not_configured', async () => {
    const start = jest.fn();

    const [result] = await run(
      startWith(start),
      { repositories: [{ repository: 'owner/missing' }] },
      fakeClient({ stored: [settings('owner/repo')] })
    );

    expect(start).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        type: 'error',
        data: {
          message: 'Repository is not configured.',
          metadata: { code: 'repository_not_configured', repository: 'owner/missing' },
        },
      })
    );
  });

  it('rejects an unsafe revision without a code', async () => {
    const [result] = await run(
      startWith(jest.fn()),
      { repositories: [{ repository: 'owner/repo', revision: '--upload-pack=x' }] },
      fakeClient({ stored: [settings('owner/repo')] })
    );

    expect(result.data).toEqual({ message: 'Revision for owner/repo is invalid.', metadata: {} });
  });

  it.each([
    [
      new ExtractionAlreadyRunningError('batch-0'),
      { code: 'extraction_already_running', extractionId: 'batch-0' },
    ],
    [new ExtractionAlreadyRunningError(), { code: 'extraction_already_running' }],
    [new ExtractionCapacityExhaustedError(), { code: 'extraction_capacity_exhausted' }],
    [new SourceUnavailableError('No sandbox.'), { code: 'sandbox_unavailable' }],
  ])('maps %p to an error result with its code', async (error, metadata) => {
    const [result] = await run(
      startWith(
        jest.fn(async () => {
          throw error;
        })
      ),
      { repositories: [{ repository: 'owner/repo' }] },
      fakeClient({ stored: [settings('owner/repo')] })
    );

    expect(result).toEqual(
      expect.objectContaining({ type: 'error', data: { message: error.message, metadata } })
    );
  });

  it('reports sandbox_unavailable when extraction was unavailable at start', async () => {
    const [result] = await run(
      createStartExtractionTool(dependencies({ extractionUnavailableReason: 'Sandbox is off.' })),
      { repositories: [{ repository: 'owner/repo' }] }
    );

    expect(result.data).toEqual({
      message: 'Sandbox is off.',
      metadata: { code: 'sandbox_unavailable' },
    });
  });

  it('leaves unexpected errors to the framework', async () => {
    const tool = startWith(
      jest.fn(async () => {
        throw new Error('boom');
      })
    );

    await expect(
      run(
        tool,
        { repositories: [{ repository: 'owner/repo' }] },
        fakeClient({ stored: [settings('owner/repo')] })
      )
    ).rejects.toThrow('boom');
  });
});

describe('get_extraction_status', () => {
  const status: ExtractionBatchStatus = {
    id: 'batch-1',
    status: 'running',
    startedAt: '2026-10-01T00:00:00.000Z',
    repositories: [],
  };

  it('returns the batch status', async () => {
    const get = jest.fn(() => status);
    const tool = createGetExtractionStatusTool(
      dependencies({ extractionService: { get } as unknown as ExtractionService })
    );

    const [result] = await run(tool, { id: 'batch-1' });

    expect(get).toHaveBeenCalledWith('batch-1');
    expect(result).toEqual(expect.objectContaining({ type: 'other', data: status }));
  });

  it('returns an error for an unknown batch', async () => {
    const tool = createGetExtractionStatusTool(
      dependencies({
        extractionService: { get: () => undefined } as unknown as ExtractionService,
      })
    );

    const [result] = await run(tool, { id: 'missing' });

    expect(result.type).toBe('error');
  });
});

const findingSource = {
  repository: 'grafana/loki',
  finding_type: 'sensitive-data',
  signal_type: 'log',
  status: 'open',
  title: 'Token logged',
  summary: 'The log writes a credential field.',
  revision: 'main',
  cataloged: true,
  catalog_document_ids: ['entry-1'],
  review_note: 'Needs review.',
  reviewed_at: '2026-10-01T00:00:00.000Z',
  evidence: [{ path: 'pkg/auth.go', line: 42, excerpt: 'logger.Info(token)' }],
};

const findingNotFound = {
  message: 'Finding was not found.',
  metadata: { code: 'finding_not_found', id: 'missing' },
};

describe('get_finding', () => {
  it('returns the full finding, including excerpts and review metadata', async () => {
    const client = fakeClient();
    client.get.mockResolvedValueOnce({
      found: true,
      _id: 'finding-1',
      _source: findingSource,
    } as never);
    const tool = createGetFindingTool(dependencies());

    const [result] = await run(tool, { id: 'finding-1' }, client);

    expect(tool.confirmation).toBeUndefined();
    expect(tool.annotations).toEqual(
      expect.objectContaining({ readOnlyHint: true, idempotentHint: true })
    );
    expect(client.get).toHaveBeenCalledWith(
      { index: 'findings', id: 'finding-1' },
      { ignore: [404] }
    );
    expect(result).toEqual(
      expect.objectContaining({
        type: 'other',
        data: { finding: { id: 'finding-1', ...findingSource } },
      })
    );
  });

  it('maps a missing finding to finding_not_found', async () => {
    const [result] = await run(createGetFindingTool(dependencies()), { id: 'missing' });
    expect(result).toEqual(expect.objectContaining({ type: 'error', data: findingNotFound }));
  });
});

describe('search_findings', () => {
  it('defaults to open findings and returns summaries without excerpts', async () => {
    const client = fakeClient({ hits: [{ _id: 'finding-1', _source: findingSource }] });

    const [result] = await run(createSearchFindingsTool(dependencies()), {}, client);

    expect(client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'findings',
        size: 10,
        from: 0,
        query: {
          bool: {
            filter: [
              { terms: { finding_type: ['sensitive-data'] } },
              { terms: { status: ['open'] } },
            ],
          },
        },
      })
    );
    expect(result.data).toEqual({
      total: 1,
      page: 1,
      perPage: 10,
      items: [
        {
          id: 'finding-1',
          repository: 'grafana/loki',
          finding_type: 'sensitive-data',
          signal_type: 'log',
          status: 'open',
          title: 'Token logged',
          summary: 'The log writes a credential field.',
          revision: 'main',
          cataloged: true,
          evidence: [{ path: 'pkg/auth.go', line: 42 }],
        },
      ],
    });
  });

  it('passes filters and caps perPage at 20', async () => {
    const client = fakeClient();
    const [result] = await run(
      createSearchFindingsTool(dependencies()),
      {
        repositories: ['grafana/loki'],
        statuses: ['verified'],
        signalTypes: ['trace'],
        q: 'token',
        page: 2,
        perPage: 500,
      },
      client
    );

    expect(client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 20,
        from: 20,
        query: {
          bool: expect.objectContaining({
            filter: [
              { terms: { finding_type: ['sensitive-data'] } },
              { terms: { repository: ['grafana/loki'] } },
              { terms: { status: ['verified'] } },
              { terms: { signal_type: ['trace'] } },
            ],
            should: expect.any(Array),
          }),
        },
      })
    );
    expect(result.data).toEqual({ total: 0, page: 2, perPage: 20, items: [] });
  });

  it('rejects unknown statuses and unbounded repository filters', () => {
    const { schema } = createSearchFindingsTool(dependencies());
    expect(schema.safeParse({ statuses: ['closed'] }).success).toBe(false);
    expect(schema.safeParse({ repositories: Array(101).fill('owner/repo') }).success).toBe(false);
  });
});

describe('update_finding_status', () => {
  it('always asks for confirmation and updates the finding with the required note', async () => {
    const client = fakeClient();
    const source = { ...findingSource, status: 'verified', review_note: 'The log writes a token.' };
    client.update.mockResolvedValueOnce({ get: { _source: source } });
    const tool = createUpdateFindingStatusTool(dependencies());

    const [result] = await run(
      tool,
      {
        id: 'finding-1',
        status: 'verified',
        note: 'The log writes a token.',
      },
      client
    );

    expect(tool.confirmation?.askUser).toBe('always');
    expect(tool.annotations).toEqual(
      expect.objectContaining({
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      })
    );
    expect(client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'findings',
        id: 'finding-1',
        refresh: 'wait_for',
        doc: {
          status: 'verified',
          review_note: 'The log writes a token.',
          reviewed_at: expect.any(String),
        },
      }),
      { ignore: [404] }
    );
    expect(result).toEqual(
      expect.objectContaining({
        type: 'other',
        data: { finding: { id: 'finding-1', ...source } },
      })
    );
  });

  it('maps a missing finding to finding_not_found', async () => {
    const [result] = await run(createUpdateFindingStatusTool(dependencies()), {
      id: 'missing',
      status: 'invalid',
      note: 'The value is not sensitive.',
    });
    expect(result).toEqual(expect.objectContaining({ type: 'error', data: findingNotFound }));
  });

  it('requires a bounded, nonempty note and id', () => {
    const { schema } = createUpdateFindingStatusTool(dependencies());
    expect(schema.safeParse({ id: 'a', status: 'open' }).success).toBe(false);
    expect(schema.safeParse({ id: 'a', status: 'open', note: '' }).success).toBe(false);
    expect(schema.safeParse({ id: 'a', status: 'open', note: 'a'.repeat(1001) }).success).toBe(
      false
    );
    expect(schema.safeParse({ id: '', status: 'open', note: 'Reopen.' }).success).toBe(false);
  });
});

describe('search_catalog', () => {
  it('passes the filters to the catalog search and trims each entry', async () => {
    const client = fakeClient({ hits: [catalogHit] });

    const [result] = await run(
      createSearchCatalogTool(dependencies()),
      { repositories: ['grafana/loki'], severities: ['critical'], q: 'flush' },
      client
    );

    expect(client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'catalog',
        from: 0,
        size: 20,
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: [
              { terms: { repository: ['grafana/loki'] } },
              {
                bool: {
                  should: [{ range: { severity_score: { gte: 80, lte: 100 } } }],
                  minimum_should_match: 1,
                },
              },
            ],
          }),
        }),
      })
    );
    expect(result.data).toEqual({
      total: 1,
      page: 1,
      perPage: 20,
      items: [
        {
          id: 'entry-1',
          repository: 'grafana/loki',
          signal_type: 'log',
          title: 'Ingester flush failed',
          description: 'Logged when a chunk flush fails.',
          query: 'FROM logs-* | WHERE message LIKE "flush failed*" | LIMIT 10',
          severity_score: 80,
          revision: '0123456789abcdef0123456789abcdef01234567',
          evidence: [{ path: 'pkg/ingester/flush.go', line: 42 }],
        },
      ],
    });
  });

  it('caps perPage', async () => {
    const client = fakeClient();

    const [result] = await run(
      createSearchCatalogTool(dependencies()),
      { perPage: 500, page: 2 },
      client
    );

    expect(client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        from: MAX_SEARCH_CATALOG_PER_PAGE,
        size: MAX_SEARCH_CATALOG_PER_PAGE,
      })
    );
    expect(result.data).toEqual(expect.objectContaining({ perPage: MAX_SEARCH_CATALOG_PER_PAGE }));
  });

  it('rejects unknown signal types and severities', () => {
    const { schema } = createSearchCatalogTool(dependencies());
    expect(schema.safeParse({ signalTypes: ['span'] }).success).toBe(false);
    expect(schema.safeParse({ severities: ['urgent'] }).success).toBe(false);
  });
});
