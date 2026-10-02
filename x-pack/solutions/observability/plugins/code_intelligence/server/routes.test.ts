/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';

import type { RepositorySettings } from '../common/repository_settings';
import { settingsMappings } from './adapters/elasticsearch_settings';
import { ExtractionAlreadyRunningError } from './extraction_already_running_error';
import { ExtractionCapacityExhaustedError } from './extraction_capacity_exhausted_error';
import type { ExtractionService } from './extraction_service';
import { registerRoutes, type RouteServices } from './routes';
import { SourceUnavailableError } from './source_session';

type Handler = (context: unknown, request: unknown, response: unknown) => Promise<unknown>;
interface RouteConfig {
  path: string;
  validate?: false | { query?: { validate: (value: unknown) => unknown } };
}

/** Keeps settings documents in memory with the calls the settings store makes. */
const fakeElasticsearch = (documents = new Map<string, Record<string, unknown>>()) => {
  const created: unknown[] = [];
  let exists = documents.size > 0;
  const client = {
    indices: {
      exists: jest.fn(async () => exists),
      create: jest.fn(async (request: unknown) => {
        created.push(request);
        exists = true;
      }),
    },
    search: jest.fn(async () => ({
      hits: {
        hits: [...documents.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id, source]) => ({ _id: id, _source: source })),
      },
    })),
    get: jest.fn(async ({ id }: { id: string }) =>
      documents.has(id) ? { found: true, _id: id, _source: documents.get(id) } : { found: false }
    ),
    index: jest.fn(async ({ id, document }: { id: string; document: Record<string, unknown> }) => {
      documents.set(id, document);
    }),
    delete: jest.fn(async ({ id }: { id: string }) => ({
      result: documents.delete(id) ? 'deleted' : 'not_found',
    })),
  };
  return { client, documents, created };
};

const settings = (repository: string, extra: Partial<RepositorySettings> = {}) => ({
  repository,
  remoteUrl: `https://github.com/${repository}.git`,
  defaultRef: 'HEAD',
  enabled: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...extra,
});

const setup = ({
  services = {},
  stored = [],
}: {
  services?: Partial<RouteServices>;
  stored?: Array<ReturnType<typeof settings>>;
} = {}) => {
  const handlers = new Map<string, Handler>();
  const configs = new Map<string, RouteConfig>();
  const register = (method: string) => (config: RouteConfig, handler: Handler) => {
    handlers.set(`${method} ${config.path}`, handler);
    configs.set(`${method} ${config.path}`, config);
  };
  const es = fakeElasticsearch(new Map(stored.map((entry) => [entry.repository, entry])));
  registerRoutes({
    catalogIndex: 'catalog',
    settingsIndex: 'settings',
    getServices: () => ({ getSpaceId: () => 'default', ...services }),
    router: {
      get: register('GET'),
      put: register('PUT'),
      post: register('POST'),
      delete: register('DELETE'),
    } as unknown as IRouter,
  });
  const call = async (route: string, request: Record<string, unknown> = {}) => {
    const handler = handlers.get(route);
    if (handler === undefined) throw new Error(`${route} was not registered.`);
    const response = {
      ok: jest.fn(),
      accepted: jest.fn(),
      badRequest: jest.fn(),
      conflict: jest.fn(),
      customError: jest.fn(),
      notFound: jest.fn(),
    };
    const context = {
      core: Promise.resolve({
        elasticsearch: { client: { asCurrentUser: es.client } },
      }),
    };
    await handler(context, request, response);
    return response;
  };
  return { call, configs, es };
};

const withStart = (start: ExtractionService['start']): Partial<RouteServices> => ({
  extractionService: { start } as unknown as ExtractionService,
});

const startBatch = (
  start: ExtractionService['start'],
  body: Record<string, unknown> = {},
  stored = [settings('elastic/example')]
) =>
  setup({ services: withStart(start), stored }).call(
    'POST /internal/code_intelligence/extractions',
    { body }
  );

describe('repository settings routes', () => {
  it('lists stored repositories in identity order', async () => {
    const { call } = setup({ stored: [settings('elastic/zeta'), settings('elastic/alpha')] });

    const response = await call('GET /internal/code_intelligence/repositories');

    expect(response.ok).toHaveBeenCalledWith({
      body: { repositories: [settings('elastic/alpha'), settings('elastic/zeta')] },
    });
  });

  it('creates the strict settings index and stores a repository under its identity', async () => {
    const { call, es } = setup();

    const response = await call('PUT /internal/code_intelligence/repositories/{owner}/{name}', {
      params: { owner: 'elastic', name: 'eis-gateway' },
      body: {
        repository: 'elastic/eis-gateway',
        remoteUrl: 'https://github.com/elastic/eis-gateway.git',
      },
    });

    expect(es.created).toEqual([{ index: 'settings', mappings: settingsMappings }]);
    expect(es.documents.get('elastic/eis-gateway')).toMatchObject({
      repository: 'elastic/eis-gateway',
      defaultRef: 'HEAD',
      enabled: true,
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: { repository: expect.objectContaining({ repository: 'elastic/eis-gateway' }) },
    });
  });

  it('keeps the original creation time when a repository is replaced', async () => {
    const { call, es } = setup({ stored: [settings('elastic/example')] });

    await call('PUT /internal/code_intelligence/repositories/{owner}/{name}', {
      params: { owner: 'elastic', name: 'example' },
      body: {
        repository: 'elastic/example',
        remoteUrl: 'https://github.com/elastic/example.git',
        enabled: false,
      },
    });

    expect(es.documents.get('elastic/example')).toMatchObject({
      enabled: false,
      createdAt: '2026-09-01T00:00:00.000Z',
    });
  });

  it('rejects a body whose repository differs from the path', async () => {
    const { call, es } = setup();

    const response = await call('PUT /internal/code_intelligence/repositories/{owner}/{name}', {
      params: { owner: 'elastic', name: 'one' },
      body: { repository: 'elastic/two', remoteUrl: 'https://github.com/elastic/two.git' },
    });

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: 'The repository in the path must match the repository in the body.' },
    });
    expect(es.client.index).not.toHaveBeenCalled();
  });

  it('rejects remotes that are not plain https URLs', async () => {
    const { call, es } = setup();

    const response = await call('PUT /internal/code_intelligence/repositories/{owner}/{name}', {
      params: { owner: 'elastic', name: 'example' },
      body: {
        repository: 'elastic/example',
        remoteUrl: 'https://token@github.com/elastic/example.git',
      },
    });

    expect(response.badRequest).toHaveBeenCalledWith({
      body: expect.objectContaining({
        attributes: { problems: [expect.objectContaining({ field: 'remoteUrl' })] },
      }),
    });
    expect(es.client.index).not.toHaveBeenCalled();
  });

  it('deletes a repository and reports a missing one as 404', async () => {
    const { call, es } = setup({ stored: [settings('elastic/example')] });
    const route = 'DELETE /internal/code_intelligence/repositories/{owner}/{name}';

    const deleted = await call(route, { params: { owner: 'elastic', name: 'example' } });
    const missing = await call(route, { params: { owner: 'elastic', name: 'example' } });

    expect(deleted.ok).toHaveBeenCalledWith({ body: { deleted: true } });
    expect(missing.notFound).toHaveBeenCalled();
    expect(es.documents.size).toBe(0);
  });
});

describe('POST /internal/code_intelligence/extractions', () => {
  it('runs every enabled repository at its default ref when no repositories are given', async () => {
    const start = jest.fn(async () => 'batch-id');

    const response = await startBatch(start, {}, [
      settings('elastic/one', { defaultRef: 'main' }),
      settings('elastic/off', { enabled: false }),
      settings('elastic/two', { githubConnectorId: 'connector' }),
    ]);

    expect(start).toHaveBeenCalledWith(
      [
        {
          repository: 'elastic/one',
          revision: 'main',
          remoteUrl: 'https://github.com/elastic/one.git',
        },
        {
          repository: 'elastic/two',
          revision: 'HEAD',
          remoteUrl: 'https://github.com/elastic/two.git',
          githubConnectorId: 'connector',
        },
      ],
      expect.anything(),
      'default',
      expect.anything()
    );
    expect(response.accepted).toHaveBeenCalledWith({ body: { id: 'batch-id' } });
  });

  it('runs the named repositories at the requested revisions, including disabled ones', async () => {
    const start = jest.fn(async () => 'batch-id');

    await startBatch(
      start,
      { repositories: [{ repository: 'elastic/off', revision: 'a'.repeat(40) }] },
      [settings('elastic/off', { enabled: false })]
    );

    expect(start).toHaveBeenCalledWith(
      [
        {
          repository: 'elastic/off',
          revision: 'a'.repeat(40),
          remoteUrl: 'https://github.com/elastic/off.git',
        },
      ],
      expect.anything(),
      'default',
      expect.anything()
    );
  });

  it('maps a repository missing from the settings index to 400 with its code', async () => {
    const start = jest.fn();

    const response = await startBatch(start, { repositories: [{ repository: 'elastic/unknown' }] });

    expect(response.badRequest).toHaveBeenCalledWith({
      body: {
        message: 'Repository is not configured.',
        attributes: { code: 'repository_not_configured', repository: 'elastic/unknown' },
      },
    });
    expect(start).not.toHaveBeenCalled();
  });

  it('rejects unsafe revisions and duplicate repositories before starting', async () => {
    const start = jest.fn();

    const unsafe = await startBatch(start, {
      repositories: [{ repository: 'elastic/example', revision: '--upload-pack=x' }],
    });
    const duplicate = await startBatch(start, {
      repositories: [{ repository: 'elastic/example' }, { repository: 'elastic/example' }],
    });

    expect(unsafe.badRequest).toHaveBeenCalled();
    expect(duplicate.badRequest).toHaveBeenCalledWith({
      body: { message: 'Each repository may appear only once.' },
    });
    expect(start).not.toHaveBeenCalled();
  });

  it('answers 400 when no repository is enabled', async () => {
    const start = jest.fn();

    const response = await startBatch(start, {}, [settings('elastic/off', { enabled: false })]);

    expect(response.badRequest).toHaveBeenCalledWith({
      body: {
        message: 'No enabled repositories to extract.',
        attributes: { code: 'no_repositories_to_extract' },
      },
    });
    expect(start).not.toHaveBeenCalled();
  });

  it('maps a batch this instance tracks to 409 Conflict with its batch id', async () => {
    const response = await startBatch(() => {
      throw new ExtractionAlreadyRunningError('running-id');
    });

    expect(response.conflict).toHaveBeenCalledWith({
      body: {
        message: 'An extraction batch is already running.',
        attributes: { code: 'extraction_already_running', extractionId: 'running-id' },
      },
    });
  });

  it('omits the batch id when another instance holds the batch lock', async () => {
    const response = await startBatch(() => {
      throw new ExtractionAlreadyRunningError();
    });

    expect(response.conflict).toHaveBeenCalledWith({
      body: {
        message: 'An extraction batch is already running.',
        attributes: { code: 'extraction_already_running' },
      },
    });
  });

  it('maps tracking capacity errors to 429 with their code', async () => {
    const response = await startBatch(() => {
      throw new ExtractionCapacityExhaustedError();
    });

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 429,
      body: {
        message: 'Extraction tracking capacity is full.',
        attributes: { code: 'extraction_capacity_exhausted' },
      },
    });
  });

  it('answers 503 when the sandbox was unavailable at start', async () => {
    const { call } = setup({
      services: { extractionUnavailableReason: 'Set `xpack.sandbox.enabled: true`.' },
      stored: [settings('elastic/example')],
    });

    const response = await call('POST /internal/code_intelligence/extractions', { body: {} });

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 503,
      body: {
        message: 'Set `xpack.sandbox.enabled: true`.',
        attributes: { code: 'sandbox_unavailable' },
      },
    });
  });

  it('answers 503 when the sandbox refuses a session', async () => {
    const response = await startBatch(() => {
      throw new SourceUnavailableError('Sandbox is not configured in this deployment.');
    });

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 503,
      body: {
        message: 'Sandbox is not configured in this deployment.',
        attributes: { code: 'sandbox_unavailable' },
      },
    });
  });

  it('leaves unexpected errors to the router', async () => {
    const failure = new Error('Elasticsearch is unavailable.');

    await expect(
      startBatch(() => {
        throw failure;
      })
    ).rejects.toBe(failure);
  });
});

describe('GET /internal/code_intelligence/catalog', () => {
  const route = 'GET /internal/code_intelligence/catalog';
  const validateQuery = (query: Record<string, unknown>) => {
    const validate = setup().configs.get(route)?.validate;
    if (validate === undefined || validate === false || validate.query === undefined) {
      throw new Error('The catalog route has no query validation.');
    }
    return validate.query.validate(query);
  };

  it('accepts no repository, a single value, or repeated values for each filter', () => {
    expect(validateQuery({})).toEqual({ page: 1, perPage: 25 });
    expect(validateQuery({ repository: 'elastic/a', kind: 'log', severity: 'high' })).toEqual(
      expect.objectContaining({ repository: 'elastic/a', kind: 'log', severity: 'high' })
    );
    expect(
      validateQuery({
        repository: ['elastic/a', 'elastic/b'],
        kind: ['log', 'trace'],
        severity: ['high', 'critical'],
      })
    ).toEqual(
      expect.objectContaining({
        repository: ['elastic/a', 'elastic/b'],
        kind: ['log', 'trace'],
        severity: ['high', 'critical'],
      })
    );
  });

  it('rejects unknown kinds and severities', () => {
    expect(() => validateQuery({ kind: 'span' })).toThrow();
    expect(() => validateQuery({ severity: ['high', 'urgent'] })).toThrow();
  });

  it('searches with no filters when none are given', async () => {
    const { call, es } = setup();
    await call(route, { query: { page: 1, perPage: 25 } });
    expect(es.client.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'catalog', query: { bool: { filter: [] } } })
    );
  });

  it('matches any selected repository, kind, and severity range', async () => {
    const { call, es } = setup();
    await call(route, {
      query: {
        repository: ['elastic/a', 'elastic/b'],
        kind: 'log',
        severity: ['low', 'critical'],
        page: 1,
        perPage: 25,
      },
    });
    expect(es.client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [
              { terms: { repository: ['elastic/a', 'elastic/b'] } },
              { terms: { signal_type: ['log'] } },
              {
                bool: {
                  should: [
                    { range: { severity_score: { gte: 0, lte: 39 } } },
                    { range: { severity_score: { gte: 80, lte: 100 } } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      })
    );
  });

  it('rejects an unknown sort', () => {
    expect(validateQuery({ sort: 'severity_desc' })).toEqual(
      expect.objectContaining({ sort: 'severity_desc' })
    );
    expect(() => validateQuery({ sort: 'title' })).toThrow();
  });

  it.each([
    [undefined, undefined, [{ updated_at: 'desc' }, '_doc']],
    [undefined, 'error', ['_score', { updated_at: 'desc' }, '_doc']],
    [
      'severity_desc',
      undefined,
      [{ severity_score: { order: 'desc', missing: '_last' } }, { updated_at: 'desc' }, '_doc'],
    ],
    [
      'severity_asc',
      'error',
      [
        { severity_score: { order: 'asc', missing: '_last' } },
        '_score',
        { updated_at: 'desc' },
        '_doc',
      ],
    ],
  ])('sorts %s with search %s', async (sort, q, expected) => {
    const { call, es } = setup();
    await call(route, {
      query: {
        page: 1,
        perPage: 25,
        ...(sort === undefined ? {} : { sort }),
        ...(q === undefined ? {} : { q }),
      },
    });
    expect(es.client.search).toHaveBeenCalledWith(expect.objectContaining({ sort: expected }));
  });
});

describe('GET /internal/code_intelligence/catalog_summary', () => {
  const route = 'GET /internal/code_intelligence/catalog_summary';

  it('counts entries per repository with the same severity ranges as the filter', async () => {
    const { call, es } = setup();
    es.client.search.mockResolvedValueOnce({
      hits: { hits: [] },
      aggregations: {
        repositories: {
          buckets: [
            {
              key: 'elastic/a',
              doc_count: 7,
              severities: {
                buckets: {
                  low: { doc_count: 3 },
                  medium: { doc_count: 0 },
                  high: { doc_count: 2 },
                  critical: { doc_count: 1 },
                },
              },
            },
          ],
        },
      },
    } as never);

    const response = await call(route);

    expect(es.client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'catalog',
        ignore_unavailable: true,
        size: 0,
        aggs: {
          repositories: {
            terms: { field: 'repository', size: 1000 },
            aggs: {
              severities: {
                filters: {
                  filters: {
                    low: { range: { severity_score: { gte: 0, lte: 39 } } },
                    medium: { range: { severity_score: { gte: 40, lte: 59 } } },
                    high: { range: { severity_score: { gte: 60, lte: 79 } } },
                    critical: { range: { severity_score: { gte: 80, lte: 100 } } },
                  },
                },
              },
            },
          },
        },
      })
    );
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        repositories: [
          {
            repository: 'elastic/a',
            total: 7,
            severities: { low: 3, medium: 0, high: 2, critical: 1 },
          },
        ],
      },
    });
  });

  it('reports no repositories when the catalog is empty', async () => {
    const { call } = setup();
    const response = await call(route);
    expect(response.ok).toHaveBeenCalledWith({ body: { repositories: [] } });
  });
});
