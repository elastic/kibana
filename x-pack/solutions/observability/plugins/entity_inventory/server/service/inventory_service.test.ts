/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityDefinitionsClient } from '@kbn/entity-store/server';
import {
  hostLikeFixture,
  k8sDeploymentOtelAndAgentFixture,
  k8sNodeFixture,
} from '../inventory/__fixtures__/definitions';
import { buildColumns } from '../inventory/generator';
import { InventoryService } from './inventory_service';

jest.mock('../inventory/generator', () => {
  const actual = jest.requireActual('../inventory/generator');
  return { ...actual, buildColumns: jest.fn(actual.buildColumns) };
});

type RegisteredDefinitions = Awaited<ReturnType<EntityDefinitionsClient['list']>>;

const createService = (definitions: RegisteredDefinitions) => {
  const list = jest.fn().mockResolvedValue(definitions);
  const get = jest.fn(async (type: string) =>
    definitions.find((definition) => definition.type === type)
  );
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  const service = new InventoryService({ get, list }, esClient, logger);
  return { service, list, esClient, logger };
};

describe('InventoryService.listTypes', () => {
  it('returns type, name, description, identity fields, columns and sources for k8s.deployment', async () => {
    const { service } = createService([k8sDeploymentOtelAndAgentFixture]);

    const { types } = await service.listTypes();

    expect(types).toEqual([
      {
        type: 'k8s.deployment',
        name: k8sDeploymentOtelAndAgentFixture.name,
        description: k8sDeploymentOtelAndAgentFixture.description,
        identityFields: [
          'k8s.cluster.name',
          'k8s.namespace.name',
          'k8s.deployment.name',
          'orchestrator.cluster.name',
          'kubernetes.namespace',
          'kubernetes.deployment.name',
        ],
        columns: [
          { name: 'entity.id', kind: 'id' },
          { name: 'k8s.cluster.name', kind: 'identity' },
          { name: 'k8s.namespace.name', kind: 'identity' },
          { name: 'k8s.deployment.name', kind: 'identity' },
          { name: 'orchestrator.cluster.name', kind: 'identity' },
          { name: 'kubernetes.namespace', kind: 'identity' },
          { name: 'kubernetes.deployment.name', kind: 'identity' },
          { name: 'available_replicas', kind: 'attribute' },
          { name: 'desired_replicas', kind: 'attribute' },
          { name: 'paused', kind: 'attribute' },
          { name: 'app', kind: 'attribute' },
          { name: 'resource_id', kind: 'attribute' },
          { name: 'last_seen', kind: 'last_seen' },
        ],
        sources: [
          {
            indexPattern: 'metrics-kubernetes.state_deployment-*',
            filter: 'metricset.name == "state_deployment"',
          },
          { indexPattern: 'metrics-k8sclusterreceiver.otel-*' },
        ],
      },
    ]);
  });

  it('omits definitions without a dynamic block', async () => {
    const { dynamic, ...withoutDynamic } = k8sNodeFixture;
    const { service } = createService([withoutDynamic, hostLikeFixture]);

    const { types } = await service.listTypes();

    expect(types.map(({ type }) => type)).toEqual([hostLikeFixture.type]);
  });

  it('includes definitions with a dynamic block whoever registered them', async () => {
    const builtIn = {
      ...k8sNodeFixture,
      type: 'host',
      managedBy: { kind: 'plugin' as const, id: 'entityStore' },
    };
    const integration = {
      ...k8sNodeFixture,
      type: 'integration.type',
      managedBy: { kind: 'integration' as const, package: 'kubernetes' },
    };
    const { service } = createService([builtIn, integration, hostLikeFixture]);

    const { types } = await service.listTypes();

    expect(types.map(({ type }) => type)).toEqual([
      builtIn.type,
      integration.type,
      hostLikeFixture.type,
    ]);
  });

  it('skips and warns on a definition that fails column derivation', async () => {
    const invalid = {
      ...k8sNodeFixture,
      dynamic: {
        sources: [
          {
            indexPattern: 'metrics-kubeletstatsreceiver.otel-default',
            attributes: [{ name: 'last_seen', field: 'host.os.name' }],
          },
        ],
      },
    };
    const { service, logger } = createService([invalid, hostLikeFixture]);

    const { types } = await service.listTypes();

    expect(types.map(({ type }) => type)).toEqual([hostLikeFixture.type]);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`"${invalid.type}"`));
  });

  it('rethrows errors other than InventoryDefinitionError from column derivation', async () => {
    jest.mocked(buildColumns).mockImplementationOnce(() => {
      throw new Error('column derivation crashed');
    });
    const { service, logger } = createService([k8sDeploymentOtelAndAgentFixture]);

    await expect(service.listTypes()).rejects.toThrow('column derivation crashed');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('rethrows errors from the definitions client', async () => {
    const { service, list } = createService([]);
    list.mockRejectedValue(new Error('registry unavailable'));

    await expect(service.listTypes()).rejects.toThrow('registry unavailable');
  });
});

const STATE_PATTERN = 'metrics-kubernetes.state_deployment-*';
const OTEL_PATTERN = 'metrics-k8sclusterreceiver.otel-*';
const WINDOW = { from: '2026-11-01T00:00:00.000Z', to: '2026-11-02T00:00:00.000Z' };
const IDENTITY_COLUMNS = [
  'k8s.cluster.name',
  'k8s.namespace.name',
  'k8s.deployment.name',
  'orchestrator.cluster.name',
  'kubernetes.namespace',
  'kubernetes.deployment.name',
];
const STATE_COLUMNS = [
  'entity.id',
  ...IDENTITY_COLUMNS,
  'available_replicas',
  'desired_replicas',
  'paused',
  'app',
  'last_seen',
];
const OTEL_COLUMNS = [
  'entity.id',
  ...IDENTITY_COLUMNS,
  'available_replicas',
  'desired_replicas',
  'resource_id',
  'last_seen',
];
const ALL_COLUMNS = [
  'entity.id',
  ...IDENTITY_COLUMNS,
  'available_replicas',
  'desired_replicas',
  'paused',
  'app',
  'resource_id',
  'last_seen',
];
const COLUMN_TYPES: Record<string, string> = {
  available_replicas: 'long',
  desired_replicas: 'long',
  paused: 'boolean',
  last_seen: 'date',
};

type Row = Record<string, string | number | boolean | null>;

interface ResponseOptions {
  nullTyped?: string[];
  isPartial?: boolean;
}

// An ES|QL response for one plan: its columns in plan order and one value array per row.
const esqlResponse = (
  names: string[],
  rows: Row[],
  { nullTyped = [], isPartial }: ResponseOptions = {}
) => ({
  columns: names.map((name) => ({
    name,
    type: nullTyped.includes(name) ? 'null' : COLUMN_TYPES[name] ?? 'keyword',
  })),
  values: rows.map((row) => names.map((name) => row[name] ?? null)),
  is_partial: isPartial ?? false,
  took: 4,
  documents_found: rows.length * 2,
});

const stateRow = (deployment: string, lastSeen: string): Row => ({
  'entity.id': `k8s.deployment:scout-cluster/checkout/${deployment}`,
  'orchestrator.cluster.name': 'scout-cluster',
  'kubernetes.namespace': 'checkout',
  'kubernetes.deployment.name': deployment,
  available_replicas: 2,
  desired_replicas: 3,
  paused: false,
  app: deployment,
  last_seen: lastSeen,
});

const otelRow = (deployment: string, lastSeen: string): Row => ({
  'entity.id': `k8s.deployment:scout-cluster/checkout/${deployment}`,
  'k8s.cluster.name': 'scout-cluster',
  'k8s.namespace.name': 'checkout',
  'k8s.deployment.name': deployment,
  available_replicas: 3,
  desired_replicas: 3,
  resource_id: `uid-${deployment}`,
  last_seen: lastSeen,
});

type EsqlResponse = ReturnType<typeof esqlResponse>;

const isProbe = (query: string) => query.includes('| LIMIT 0');
const patternOf = (query: string) => (query.includes(STATE_PATTERN) ? STATE_PATTERN : OTEL_PATTERN);

// A probe answer: `@timestamp` typed `date` when a time-series index exists behind the pattern.
const probeResponse = (hasTimeSeries: boolean) => ({
  columns: [{ name: '@timestamp', type: hasTimeSeries ? 'date' : 'null' }],
  values: [],
  is_partial: false,
  took: 1,
  documents_found: 0,
});

interface AnswerOptions {
  timeSeries?: string[];
  probeFails?: Record<string, { throws: Error }>;
}

// Answers each probe by its pattern (no time-series index unless listed) and each plan's query by
// its index pattern; a `{ throws }` answer is thrown as the client would.
const answerByPattern = (
  esClient: ReturnType<typeof createService>['esClient'],
  answers: Record<string, EsqlResponse | { throws: Error }>,
  { timeSeries = [], probeFails = {} }: AnswerOptions = {}
) => {
  esClient.esql.query.mockImplementation(async ({ query }) => {
    const pattern = patternOf(query);
    if (isProbe(query)) {
      if (pattern in probeFails) {
        throw probeFails[pattern].throws;
      }
      return probeResponse(timeSeries.includes(pattern));
    }
    const answer = answers[pattern];
    if ('throws' in answer) {
      throw answer.throws;
    }
    return answer;
  });
};

const esError = (status: number, type: string, reason: string) => ({
  throws: Object.assign(new Error(`${type}: ${reason}`), {
    meta: { statusCode: status, body: { error: { type, reason } } },
  }),
});

const { dynamic: _nodeDynamic, ...k8sNodeWithoutDynamic } = k8sNodeFixture;

describe('InventoryService.list', () => {
  it('probes each source pattern once, then runs one FROM query per source', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    answerByPattern(esClient, {
      [STATE_PATTERN]: esqlResponse(STATE_COLUMNS, []),
      [OTEL_PATTERN]: esqlResponse(OTEL_COLUMNS, []),
    });

    await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10 });

    const sent = esClient.esql.query.mock.calls.map(([body]) => body.query);
    expect(sent.filter(isProbe).map(patternOf)).toEqual([STATE_PATTERN, OTEL_PATTERN]);
    const listQueries = esClient.esql.query.mock.calls
      .map(([body]) => body)
      .filter(({ query }) => !isProbe(query));
    // Every FROM plan excludes time-series indices, whether or not a TS plan reads them.
    expect(listQueries.map(({ query }) => query.split('\n')[1])).toEqual([
      `FROM ${STATE_PATTERN} METADATA _index_mode`,
      `FROM ${OTEL_PATTERN} METADATA _index_mode`,
    ]);
    listQueries.forEach(({ query, params }) => {
      expect(query).toContain('| LIMIT 11');
      expect(params).toEqual([{ from: WINDOW.from }, { to: WINDOW.to }]);
    });
  });

  it('adds a TS plan before the FROM plan of a source whose probe found a time-series index', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    answerByPattern(
      esClient,
      {
        [STATE_PATTERN]: esqlResponse(STATE_COLUMNS, []),
        [OTEL_PATTERN]: esqlResponse(OTEL_COLUMNS, []),
      },
      { timeSeries: [OTEL_PATTERN] }
    );

    await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10 });

    const listQueries = esClient.esql.query.mock.calls
      .map(([body]) => body.query)
      .filter((query) => !isProbe(query));
    expect(listQueries.map((query) => query.split('\n')[1])).toEqual([
      `FROM ${STATE_PATTERN} METADATA _index_mode`,
      `TS ${OTEL_PATTERN}`,
      `FROM ${OTEL_PATTERN} METADATA _index_mode`,
    ]);
  });

  it('reports a failed probe in errors and runs no plan of that source', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    answerByPattern(
      esClient,
      {
        [STATE_PATTERN]: esqlResponse(STATE_COLUMNS, []),
        [OTEL_PATTERN]: esqlResponse(OTEL_COLUMNS, [
          otelRow('cart-api', '2026-11-01T10:02:00.000Z'),
        ]),
      },
      { probeFails: { [STATE_PATTERN]: esError(503, 'timeout_exception', 'timed out') } }
    );

    const response = await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10 });

    expect(response.errors).toEqual([
      { indexPattern: STATE_PATTERN, status: 503, reason: 'timeout_exception: timed out' },
    ]);
    expect(response.rows).toHaveLength(1);
    expect(response).toMatchObject({ total: null, truncated: false });
  });

  it('merges rows across sources, newest last_seen first, with exact total and every column on every row', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    answerByPattern(esClient, {
      [STATE_PATTERN]: esqlResponse(STATE_COLUMNS, [
        stateRow('payments', '2026-11-01T10:01:00.000Z'),
        stateRow('cart-api', '2026-11-01T10:00:00.000Z'),
      ]),
      [OTEL_PATTERN]: esqlResponse(OTEL_COLUMNS, [otelRow('cart-api', '2026-11-01T10:02:00.000Z')]),
    });

    const response = await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10 });

    expect(response.rows.map((row) => row['entity.id'])).toEqual([
      'k8s.deployment:scout-cluster/checkout/cart-api',
      'k8s.deployment:scout-cluster/checkout/payments',
    ]);
    response.rows.forEach((row) => expect(Object.keys(row)).toEqual(ALL_COLUMNS));
    expect(response.rows[0]).toMatchObject({
      available_replicas: 3,
      paused: false,
      resource_id: 'uid-cart-api',
      last_seen: '2026-11-01T10:02:00.000Z',
    });
    expect(response.rows[1]).toMatchObject({ resource_id: null, 'k8s.cluster.name': null });
    expect(response.columns.map(({ name }) => name)).toEqual(ALL_COLUMNS);
    expect(response).toMatchObject({
      total: 2,
      truncated: false,
      errors: [],
      unavailableColumns: [],
    });
    expect(response).not.toHaveProperty('unsupportedMetrics');
    expect(response).not.toHaveProperty('documentFilterWarnings');
  });

  it.each([
    ['another plugin', { kind: 'plugin' as const, id: 'entityStore' }],
    ['an integration', { kind: 'integration' as const, package: 'kubernetes' }],
  ])('lists the rows of a type that %s registered', async (_label, managedBy) => {
    const { service, esClient } = createService([
      { ...k8sDeploymentOtelAndAgentFixture, managedBy },
    ]);
    answerByPattern(esClient, {
      [STATE_PATTERN]: esqlResponse(STATE_COLUMNS, [
        stateRow('cart-api', '2026-11-01T10:00:00.000Z'),
      ]),
      [OTEL_PATTERN]: esqlResponse(OTEL_COLUMNS, []),
    });

    const response = await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10 });

    expect(response.rows.map((row) => row['entity.id'])).toEqual([
      'k8s.deployment:scout-cluster/checkout/cart-api',
    ]);
    expect(response).toMatchObject({ total: 1, errors: [] });
  });

  it('starts every list query before any resolves', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    const pending: Array<() => void> = [];
    esClient.esql.query.mockImplementation(({ query }) =>
      isProbe(query)
        ? Promise.resolve(probeResponse(false))
        : new Promise((resolve) => {
            const names = query.includes(STATE_PATTERN) ? STATE_COLUMNS : OTEL_COLUMNS;
            pending.push(() => resolve(esqlResponse(names, [])));
          })
    );

    const listing = service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10 });
    await new Promise(setImmediate);

    expect(pending).toHaveLength(2);
    pending.forEach((resolve) => resolve());
    await expect(listing).resolves.toMatchObject({ rows: [], total: 0 });
  });

  it('reports a failed query in errors with its status and reason and returns the other source', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    answerByPattern(esClient, {
      [STATE_PATTERN]: esError(400, 'verification_exception', 'Unknown column [x]'),
      [OTEL_PATTERN]: esqlResponse(OTEL_COLUMNS, [otelRow('cart-api', '2026-11-01T10:02:00.000Z')]),
    });

    const response = await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10 });

    expect(response.rows).toHaveLength(1);
    expect(response.errors).toEqual([
      {
        indexPattern: STATE_PATTERN,
        status: 400,
        reason: 'verification_exception: Unknown column [x]',
      },
    ]);
    expect(JSON.stringify(response.errors)).not.toContain('at ');
    expect(response).toMatchObject({ total: null, truncated: false });
  });

  it('drops a plan whose pattern maps no @timestamp and one whose identity is unmapped', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    answerByPattern(esClient, {
      [STATE_PATTERN]: esqlResponse(STATE_COLUMNS, [], { nullTyped: STATE_COLUMNS }),
      [OTEL_PATTERN]: esqlResponse(OTEL_COLUMNS, [], { nullTyped: IDENTITY_COLUMNS }),
    });

    const response = await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10 });

    expect(response.rows).toEqual([]);
    expect(response.errors).toEqual([
      {
        indexPattern: STATE_PATTERN,
        status: null,
        reason: `no readable index behind "${STATE_PATTERN}" maps @timestamp`,
      },
      {
        indexPattern: OTEL_PATTERN,
        status: null,
        reason: expect.stringContaining(`no index behind "${OTEL_PATTERN}" maps every field`),
      },
    ]);
    // Neither query failed: the patterns read nothing usable, so the count of zero is exact.
    expect(response).toMatchObject({ total: 0, truncated: false });
  });

  it('returns no rows and an exact zero total when no source has data in the window', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    answerByPattern(esClient, {
      [STATE_PATTERN]: esqlResponse(STATE_COLUMNS, []),
      [OTEL_PATTERN]: esqlResponse(OTEL_COLUMNS, []),
    });

    const response = await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10 });

    expect(response).toMatchObject({ rows: [], total: 0, truncated: false, errors: [] });
    expect(response.columns).toHaveLength(13);
  });

  it('returns no rows and lists each failure when every query fails', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    answerByPattern(esClient, {
      [STATE_PATTERN]: esError(403, 'security_exception', 'unauthorized'),
      [OTEL_PATTERN]: { throws: new Error('connect ECONNREFUSED') },
    });

    const response = await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10 });

    expect(response).toMatchObject({
      rows: [],
      total: null,
      truncated: false,
      errors: [
        { indexPattern: STATE_PATTERN, status: 403, reason: 'security_exception: unauthorized' },
        { indexPattern: OTEL_PATTERN, status: null, reason: 'connect ECONNREFUSED' },
      ],
    });
  });

  it('nulls an attribute no index of its source maps and lists it in unavailableColumns', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    answerByPattern(esClient, {
      [STATE_PATTERN]: esqlResponse(STATE_COLUMNS, [], {}),
      [OTEL_PATTERN]: esqlResponse(
        OTEL_COLUMNS,
        [{ ...otelRow('cart-api', '2026-11-01T10:02:00.000Z'), resource_id: null }],
        { nullTyped: ['resource_id'] }
      ),
    });

    const response = await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10 });

    expect(response.rows[0].resource_id).toBeNull();
    expect(response.unavailableColumns).toEqual([
      { column: 'resource_id', indexPattern: OTEL_PATTERN, field: 'k8s.deployment.uid' },
    ]);
    expect(response.columns.find(({ name }) => name === 'resource_id')?.type).toBeNull();
  });

  it('returns limit rows with an exact total when no plan is cut', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    answerByPattern(esClient, {
      [STATE_PATTERN]: esqlResponse(STATE_COLUMNS, [
        stateRow('payments', '2026-11-01T10:01:00.000Z'),
      ]),
      [OTEL_PATTERN]: esqlResponse(OTEL_COLUMNS, [otelRow('cart-api', '2026-11-01T10:02:00.000Z')]),
    });

    const response = await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 1 });

    expect(response.rows.map((row) => row['entity.id'])).toEqual([
      'k8s.deployment:scout-cluster/checkout/cart-api',
    ]);
    expect(response).toMatchObject({ total: 2, truncated: true });
  });

  it('reports total null and truncated when a plan returns more rows than requested', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    answerByPattern(esClient, {
      [STATE_PATTERN]: esqlResponse(STATE_COLUMNS, [
        stateRow('payments', '2026-11-01T10:01:00.000Z'),
        stateRow('cart-api', '2026-11-01T10:00:00.000Z'),
      ]),
      [OTEL_PATTERN]: esqlResponse(OTEL_COLUMNS, []),
    });

    const response = await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 1 });

    expect(response.rows).toHaveLength(1);
    expect(response).toMatchObject({ total: null, truncated: true });
  });

  it('reports a partial result in errors with total null, keeping its rows and not truncating', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    answerByPattern(esClient, {
      [STATE_PATTERN]: esqlResponse(
        STATE_COLUMNS,
        [stateRow('payments', '2026-11-01T10:01:00.000Z')],
        {
          isPartial: true,
        }
      ),
      [OTEL_PATTERN]: esqlResponse(OTEL_COLUMNS, [otelRow('cart-api', '2026-11-01T10:02:00.000Z')]),
    });

    const response = await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10 });

    expect(response.rows).toHaveLength(2);
    expect(response).toMatchObject({
      total: null,
      truncated: false,
      errors: [
        {
          indexPattern: STATE_PATTERN,
          status: null,
          reason: 'partial result: some shards or clusters did not answer, so rows may be missing',
        },
      ],
    });
  });

  it.each([
    [
      'an unknown type',
      'k8s.unknown',
      [k8sDeploymentOtelAndAgentFixture],
      'no entity definition is registered for it',
    ],
    [
      'a type without a dynamic block',
      k8sNodeFixture.type,
      [k8sNodeWithoutDynamic],
      'its entity definition has no dynamic block',
    ],
  ])(
    'throws InventoryTypeNotFoundError for %s without querying',
    async (_label, type, definitions, reason) => {
      const { service, esClient } = createService(definitions);

      await expect(service.list({ type, window: WINDOW, limit: 10 })).rejects.toMatchObject({
        name: 'InventoryTypeNotFoundError',
        statusCode: 404,
        message: `Entity type "${type}" is not available in the entity inventory: ${reason}`,
      });
      expect(esClient.esql.query).not.toHaveBeenCalled();
    }
  );

  it('passes the abort signal to every probe and list query', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    answerByPattern(
      esClient,
      {
        [STATE_PATTERN]: esqlResponse(STATE_COLUMNS, []),
        [OTEL_PATTERN]: esqlResponse(OTEL_COLUMNS, []),
      },
      { timeSeries: [OTEL_PATTERN] }
    );
    const { signal } = new AbortController();

    await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10, signal });

    // Two probes, then FROM, TS and FROM list queries.
    expect(esClient.esql.query).toHaveBeenCalledTimes(5);
    const sentSignals = esClient.esql.query.mock.calls.map(([, options]) => options?.signal);
    expect(sentSignals.every((sent) => sent === signal)).toBe(true);
  });

  it('throws InventoryTypeDefinitionError when the definition cannot be turned into queries', async () => {
    const invalid = {
      ...k8sDeploymentOtelAndAgentFixture,
      dynamic: {
        sources: [{ indexPattern: STATE_PATTERN, attributes: [{ name: 'last_seen', field: 'x' }] }],
      },
    };
    const { service, esClient, logger } = createService([invalid]);
    answerByPattern(esClient, {});

    await expect(
      service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10 })
    ).rejects.toMatchObject({
      name: 'InventoryTypeDefinitionError',
      statusCode: 400,
      message: expect.stringContaining(
        'Entity type "k8s.deployment" cannot be queried: attribute name "last_seen" is reserved'
      ),
    });
    // A registered definition that cannot be queried is a server bug, so it is logged at error level, not only answered with 400.
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Entity type "k8s.deployment" cannot be queried')
    );
  });
});

describe('InventoryService.list diagnostics', () => {
  const CART_API_ID = 'k8s.deployment:scout-cluster/checkout/cart-api';

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports provenance for the returned rows only, naming the source of each attribute', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    answerByPattern(esClient, {
      [STATE_PATTERN]: esqlResponse(STATE_COLUMNS, [
        stateRow('payments', '2026-11-01T10:01:00.000Z'),
        stateRow('cart-api', '2026-11-01T10:00:00.000Z'),
      ]),
      [OTEL_PATTERN]: esqlResponse(OTEL_COLUMNS, [otelRow('cart-api', '2026-11-01T10:02:00.000Z')]),
    });

    const response = await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 1 });

    expect(response.rows.map((row) => row['entity.id'])).toEqual([CART_API_ID]);
    expect(Object.keys(response.provenance)).toEqual([CART_API_ID]);
    expect(response.provenance[CART_API_ID]).toMatchObject({
      available_replicas: OTEL_PATTERN,
      resource_id: OTEL_PATTERN,
      paused: STATE_PATTERN,
      app: STATE_PATTERN,
    });
  });

  it('lists every plan query sent, in plan order, with its text, parameters and stats, and no probe', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    answerByPattern(
      esClient,
      {
        [STATE_PATTERN]: esqlResponse(STATE_COLUMNS, [
          stateRow('payments', '2026-11-01T10:01:00.000Z'),
        ]),
        [OTEL_PATTERN]: esqlResponse(OTEL_COLUMNS, []),
      },
      { timeSeries: [OTEL_PATTERN] }
    );

    const response = await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10 });

    const sentPlanQueries = esClient.esql.query.mock.calls
      .map(([body]) => body.query)
      .filter((query) => !isProbe(query));
    expect(response.queries.map(({ esql }) => esql)).toEqual(sentPlanQueries);
    expect(response.queries.map(({ indexPattern, engine }) => ({ indexPattern, engine }))).toEqual([
      { indexPattern: STATE_PATTERN, engine: 'FROM' },
      { indexPattern: OTEL_PATTERN, engine: 'TS' },
      { indexPattern: OTEL_PATTERN, engine: 'FROM' },
    ]);
    expect(response.queries[0]).toEqual({
      indexPattern: STATE_PATTERN,
      engine: 'FROM',
      esql: sentPlanQueries[0],
      params: [{ from: WINDOW.from }, { to: WINDOW.to }],
      took: 4,
      documentsFound: 2,
      rowCount: 1,
    });
  });

  it('lists a failed plan query with null stats and no rows', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    answerByPattern(esClient, {
      [STATE_PATTERN]: esError(400, 'verification_exception', 'Unknown column [x]'),
      [OTEL_PATTERN]: esqlResponse(OTEL_COLUMNS, [otelRow('cart-api', '2026-11-01T10:02:00.000Z')]),
    });

    const response = await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10 });

    expect(response.queries).toHaveLength(2);
    expect(response.queries[0]).toMatchObject({
      indexPattern: STATE_PATTERN,
      took: null,
      documentsFound: null,
      rowCount: 0,
    });
    expect(response.queries[1]).toMatchObject({ indexPattern: OTEL_PATTERN, rowCount: 1 });
  });

  it('leaves out the plan queries of a source whose probe failed', async () => {
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    answerByPattern(
      esClient,
      {
        [STATE_PATTERN]: esqlResponse(STATE_COLUMNS, []),
        [OTEL_PATTERN]: esqlResponse(OTEL_COLUMNS, []),
      },
      { probeFails: { [STATE_PATTERN]: esError(503, 'timeout_exception', 'timed out') } }
    );

    const response = await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10 });

    expect(response.queries.map(({ indexPattern }) => indexPattern)).toEqual([OTEL_PATTERN]);
  });

  it('reports took as the wall time of the whole call, probes included', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-01T12:00:00.000Z') });
    const { service, esClient } = createService([k8sDeploymentOtelAndAgentFixture]);
    // Each probe and plan query takes 100ms of wall time: two probes, then two FROM queries.
    esClient.esql.query.mockImplementation(async ({ query }) => {
      jest.advanceTimersByTime(100);
      if (isProbe(query)) {
        return probeResponse(false);
      }
      return query.includes(STATE_PATTERN)
        ? esqlResponse(STATE_COLUMNS, [])
        : esqlResponse(OTEL_COLUMNS, []);
    });

    const response = await service.list({ type: 'k8s.deployment', window: WINDOW, limit: 10 });

    expect(response.took).toBe(400);
  });
});
