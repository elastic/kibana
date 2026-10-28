/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEncodedPowershellTwin,
  getEncodedPowershellIds,
} from '../scenarios/encoded_powershell';
import {
  FP_TP_BOOTSTRAP_RULE_ID,
  FP_TP_RAW_EVENT_INDEX_TEMPLATE,
  FP_TP_RAW_EVENT_INGEST_PIPELINE,
  FP_TP_REASONING_FEATURE_ID,
  FP_TP_TWIN_SEED_LABEL,
  toServerlessEventIndex,
} from './constants';
import {
  assertClassicSpace,
  assertServerlessSpace,
  buildServerlessPlan,
  cleanupServerlessSeed,
  ensureBootstrapNoMatchRule,
  ensureReasoningMapping,
  findPersistedAttackId,
  readReasoningConnectorId,
  runValidateWorkflow,
  seedTwinLiveServerless,
  twinToWorld,
  waitForAlertsDataStream,
} from './seed_live';
import type { FpTpLiveKbnRequest, FpTpValidateInputs } from './seed_live';

type EsClientArg = Parameters<typeof cleanupServerlessSeed>[0]['esClient'];

const NOW = new Date('2026-10-13T12:00:00.000Z');
const SETTINGS_PATH = '/internal/search_inference_endpoints/settings';
const ids = getEncodedPowershellIds();

/**
 * Makes `sleep` resolve immediately and advances the clock by the requested
 * delay, so polling loops neither wait in real time nor spin forever when a
 * regression stops them from terminating.
 */
const skipSleeps = () => {
  const realNow = Date.now.bind(Date);
  let offsetMs = 0;
  jest.spyOn(Date, 'now').mockImplementation(() => realNow() + offsetMs);
  jest.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void, ms?: number) => {
    offsetMs += ms ?? 0;
    callback();
    return 0 as unknown as NodeJS.Timeout;
  }) as unknown as typeof setTimeout);
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('toServerlessEventIndex', () => {
  it('rewrites a -default index into the seeder-owned namespace', () => {
    expect(toServerlessEventIndex('logs-endpoint.events.process-default', 'fptp-1')).toBe(
      'logs-endpoint.events.fp-tp-process-fptp-1'
    );
  });

  it('lands inside the template claim and the workflow wildcard', () => {
    expect(toServerlessEventIndex('logs-endpoint.events.process-default', 'fptp-1')).toMatch(
      /^logs-endpoint\.events\.fp-tp-/
    );
  });

  it('throws on an index that is not a scenario-authored -default stream', () => {
    expect(() => toServerlessEventIndex('logs-endpoint.events.process-prod', 'fptp-1')).toThrow(
      /Cannot seed logs-endpoint.events.process-prod/
    );
  });
});

describe('assertServerlessSpace', () => {
  it('refuses the default space and a missing space', () => {
    expect(() => assertServerlessSpace('default')).toThrow(/refuses the default space/);
    expect(() => assertServerlessSpace(undefined)).toThrow(/explicit --space/);
    expect(() => assertServerlessSpace('')).toThrow(/explicit --space/);
  });

  it('rejects ids outside [a-z0-9][a-z0-9_-]{0,63}', () => {
    for (const bad of ['Has-Upper', '-leading', 'with space', 'a/b', 'x'.repeat(65)]) {
      expect(() => assertServerlessSpace(bad)).toThrow(/not a valid Kibana space id/);
    }
  });

  it('accepts a dedicated space id', () => {
    expect(assertServerlessSpace('fptp-eval_1')).toBe('fptp-eval_1');
    expect(assertServerlessSpace('x'.repeat(64))).toHaveLength(64);
  });
});

describe('assertClassicSpace', () => {
  it('accepts the default space and an omitted one', () => {
    expect(() => assertClassicSpace('default')).not.toThrow();
    expect(() => assertClassicSpace(undefined)).not.toThrow();
  });

  it('refuses any other space without --serverless', () => {
    expect(() => assertClassicSpace('fptp-eval-1')).toThrow(/needs --serverless/);
  });
});

describe('buildServerlessPlan space scoping', () => {
  const twin = buildEncodedPowershellTwin('tp');
  const world = twinToWorld(twin);
  const before = JSON.stringify(world);
  const plan = buildServerlessPlan(world, 'fptp-eval-1', NOW);

  it('tags every alert and the attack to the space, in the plan and the bulk operations', () => {
    expect(plan.world.alerts.length).toBeGreaterThan(0);
    for (const alert of plan.world.alerts) {
      expect(alert.source['kibana.space_ids']).toEqual(['fptp-eval-1']);
    }
    expect(plan.world.attack?.['kibana.space_ids']).toEqual(['fptp-eval-1']);
    const bulkBodies = plan.alertOperations.filter((_, position) => position % 2 === 1) as Array<
      Record<string, unknown>
    >;
    expect(bulkBodies).toHaveLength(plan.world.alerts.length);
    for (const body of bulkBodies) {
      expect(body['kibana.space_ids']).toEqual(['fptp-eval-1']);
    }
  });

  it('rewrites data_stream.namespace of events to match the index they go to', () => {
    expect(plan.world.events.length).toBeGreaterThan(0);
    for (const event of plan.world.events) {
      expect((event.source.data_stream as { namespace: string }).namespace).toBe('fptp-eval-1');
      expect(event.index.endsWith('-fptp-eval-1')).toBe(true);
    }
    const eventBodies = plan.eventOperations.filter((_, position) => position % 2 === 1) as Array<{
      data_stream: { namespace: string };
    }>;
    for (const body of eventBodies) {
      expect(body.data_stream.namespace).toBe('fptp-eval-1');
    }
  });

  it('does not mutate the world it was built from', () => {
    expect(JSON.stringify(world)).toBe(before);
    expect(world.alerts[0].source['kibana.space_ids']).toEqual(['default']);
  });
});

describe('readReasoningConnectorId', () => {
  it('throws when the settings read fails', async () => {
    const kbnRequest: FpTpLiveKbnRequest = jest
      .fn()
      .mockResolvedValue({ statusCode: 500, body: {} });
    await expect(readReasoningConnectorId(kbnRequest)).rejects.toThrow(
      /Failed to read inference settings \(500\)/
    );
  });
});

describe('ensureReasoningMapping', () => {
  const other = { feature_id: 'other_feature', endpoints: [{ id: 'other-connector' }] };

  const settingsRequest = (features: unknown[], getStatus = 200) => {
    const calls: Array<Parameters<FpTpLiveKbnRequest>[0]> = [];
    const kbnRequest: FpTpLiveKbnRequest = async (options) => {
      calls.push(options);
      if (options.method === 'GET') {
        return { statusCode: getStatus, body: { data: { features } } };
      }
      return { statusCode: 200, body: {} };
    };
    return { kbnRequest, calls };
  };

  it('keeps the other features in the PUT body and replaces only the reasoning mapping', async () => {
    const { kbnRequest, calls } = settingsRequest([
      other,
      { feature_id: FP_TP_REASONING_FEATURE_ID, endpoints: [{ id: 'stale-connector' }] },
    ]);

    await ensureReasoningMapping(kbnRequest, 'wanted-connector');

    const put = calls.find((call) => call.method === 'PUT');
    expect(put?.path).toBe(SETTINGS_PATH);
    expect(put?.body).toEqual({
      features: [
        other,
        { feature_id: FP_TP_REASONING_FEATURE_ID, endpoints: [{ id: 'wanted-connector' }] },
      ],
    });
  });

  it('is a no-op when the connector is already mapped', async () => {
    const { kbnRequest, calls } = settingsRequest([
      other,
      { feature_id: FP_TP_REASONING_FEATURE_ID, endpoints: [{ id: 'wanted-connector' }] },
    ]);

    await ensureReasoningMapping(kbnRequest, 'wanted-connector');

    expect(calls.map((call) => call.method)).toEqual(['GET']);
  });

  it('never PUTs when the settings read fails, so other features are not wiped', async () => {
    const { kbnRequest, calls } = settingsRequest([], 503);

    await expect(ensureReasoningMapping(kbnRequest, 'wanted-connector')).rejects.toThrow(
      /Failed to read inference settings \(503\)/
    );
    expect(calls.some((call) => call.method === 'PUT')).toBe(false);
  });

  it('throws when the PUT is rejected', async () => {
    const kbnRequest: FpTpLiveKbnRequest = async ({ method }) =>
      method === 'GET'
        ? { statusCode: 200, body: { data: { features: [] } } }
        : { statusCode: 400, body: { message: 'nope' } };

    await expect(ensureReasoningMapping(kbnRequest, 'c')).rejects.toThrow(
      /Failed to map.*400.*nope/
    );
  });
});

describe('ensureBootstrapNoMatchRule', () => {
  it('does nothing when the rule exists', async () => {
    const kbnRequest = jest.fn().mockResolvedValue({ statusCode: 200, body: {} });
    await ensureBootstrapNoMatchRule(kbnRequest);
    expect(kbnRequest).toHaveBeenCalledTimes(1);
  });

  it('creates an enabled rule with the bootstrap id when it is missing', async () => {
    const kbnRequest = jest
      .fn()
      .mockResolvedValueOnce({ statusCode: 404, body: {} })
      .mockResolvedValueOnce({ statusCode: 200, body: {} });
    await ensureBootstrapNoMatchRule(kbnRequest);
    const post = kbnRequest.mock.calls[1][0];
    expect(post.method).toBe('POST');
    expect(post.body).toEqual(
      expect.objectContaining({ rule_id: FP_TP_BOOTSTRAP_RULE_ID, enabled: true })
    );
  });

  it('throws on a lookup failure other than not-found', async () => {
    const kbnRequest = jest.fn().mockResolvedValue({ statusCode: 500, body: {} });
    await expect(ensureBootstrapNoMatchRule(kbnRequest)).rejects.toThrow(
      /Failed to look up bootstrap rule \(500\)/
    );
    expect(kbnRequest).toHaveBeenCalledTimes(1);
  });
});

describe('waitForAlertsDataStream', () => {
  it('resolves once the data stream exists', async () => {
    skipSleeps();
    const exists = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await waitForAlertsDataStream({ indices: { exists } } as unknown as EsClientArg, 'idx');
    expect(exists).toHaveBeenCalledTimes(2);
    expect(exists).toHaveBeenCalledWith({ index: 'idx' });
  });

  it('throws when the data stream never appears', async () => {
    skipSleeps();
    const exists = jest.fn().mockResolvedValue(false);
    await expect(
      waitForAlertsDataStream({ indices: { exists } } as unknown as EsClientArg, 'idx')
    ).rejects.toThrow(/Alerts data stream idx did not appear/);
  });
});

describe('findPersistedAttackId', () => {
  it('returns the _id of the discovery matched by title', async () => {
    const search = jest.fn().mockResolvedValue({ hits: { hits: [{ _id: 'persisted-1' }] } });
    const id = await findPersistedAttackId({ search } as unknown as EsClientArg, 'adhoc-idx', 'T');
    expect(id).toBe('persisted-1');
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'adhoc-idx',
        query: { match_phrase: { 'kibana.alert.attack_discovery.title': 'T' } },
      })
    );
  });

  it('throws when no discovery was persisted', async () => {
    const search = jest.fn().mockResolvedValue({ hits: { hits: [] } });
    await expect(
      findPersistedAttackId({ search } as unknown as EsClientArg, 'adhoc-idx', 'T')
    ).rejects.toThrow(/No persisted Attack Discovery titled "T" in adhoc-idx/);
  });
});

describe('runValidateWorkflow', () => {
  const inputs = {} as unknown as FpTpValidateInputs;

  const requestWith = (statuses: string[]): FpTpLiveKbnRequest => {
    let polled = 0;
    return async ({ method }) => {
      if (method === 'POST') {
        return { statusCode: 200, body: { workflowExecutionId: 'exec-1' } };
      }
      const status = statuses[Math.min(polled, statuses.length - 1)];
      polled++;
      return { statusCode: 200, body: { status } };
    };
  };

  it('resolves when the execution completes', async () => {
    skipSleeps();
    await expect(runValidateWorkflow(requestWith(['running', 'completed']), inputs)).resolves.toBe(
      undefined
    );
  });

  it.each(['failed', 'cancelled'])('throws when the execution ends "%s"', async (status) => {
    skipSleeps();
    await expect(runValidateWorkflow(requestWith([status]), inputs)).rejects.toThrow(
      new RegExp(`ended "${status}"`)
    );
  });

  it('throws when the run is rejected', async () => {
    const kbnRequest: FpTpLiveKbnRequest = async () => ({
      statusCode: 500,
      body: { message: 'x' },
    });
    await expect(runValidateWorkflow(kbnRequest, inputs)).rejects.toThrow(/Failed to run.*500/);
  });
});

describe('cleanupServerlessSeed targets', () => {
  const world = twinToWorld(buildEncodedPowershellTwin('fp'));
  const plan = buildServerlessPlan(world, 'fptp-eval-1', NOW);

  it('deletes alert ids from the space alerts index and events from the -<space> indices', async () => {
    const deleteByQuery = jest.fn().mockResolvedValue({});
    const search = jest.fn().mockResolvedValue({ hits: { hits: [] } });
    const kbnRequest = jest.fn().mockResolvedValue({ statusCode: 404, body: {} });

    await cleanupServerlessSeed({
      esClient: { deleteByQuery, search } as unknown as EsClientArg,
      kbnRequest,
      plan,
    });

    const byIndex = new Map<string, unknown[]>();
    for (const [params] of deleteByQuery.mock.calls as Array<[Record<string, unknown>]>) {
      const queries = byIndex.get(params.index as string) ?? [];
      queries.push(params.query);
      byIndex.set(params.index as string, queries);
    }
    expect(byIndex.get('.alerts-security.alerts-fptp-eval-1')).toContainEqual({
      ids: { values: [...plan.alertIds] },
    });
    // the seeder-owned streams are swept by seed-label prefix within the
    // space's namespace (a crashed run's leftovers are not nameable by id)
    // and by id
    expect(byIndex.get('logs-endpoint.events.fp-tp-*')).toContainEqual({
      bool: {
        filter: [
          { term: { 'data_stream.namespace': 'fptp-eval-1' } },
          {
            bool: {
              should: [
                { prefix: { 'labels.ad_portable_seed': FP_TP_TWIN_SEED_LABEL } },
                { terms: { 'host.id': [...plan.hostIds] } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
    expect(byIndex.get('logs-endpoint.events.fp-tp-process-fptp-eval-1')).toContainEqual({
      ids: { values: expect.arrayContaining([ids.process1Id]) as string[] },
    });
    for (const index of byIndex.keys()) {
      expect(index).not.toMatch(/-default$/);
      expect(index).not.toBe('.alerts-security.alerts-default');
    }
  });

  it("also removes an earlier seed of another scenario found by the space's seeded alerts", async () => {
    const deleteByQuery = jest.fn().mockResolvedValue({});
    const search = jest.fn(async ({ index }: { index: string }) =>
      index === plan.alertsIndex
        ? {
            hits: {
              hits: [
                { _id: 'old-alert-1', _source: { host: { id: 'old-host' } } },
                { _id: 'old-alert-2', _source: { host: { id: 'old-host' } } },
              ],
            },
          }
        : { hits: { hits: [] } }
    );
    const kbnRequest = jest.fn().mockResolvedValue({ statusCode: 404, body: {} });

    await cleanupServerlessSeed({
      esClient: { deleteByQuery, search } as unknown as EsClientArg,
      kbnRequest,
      plan,
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: plan.alertsIndex,
        query: { prefix: { tags: FP_TP_TWIN_SEED_LABEL } },
      })
    );
    const calls = (deleteByQuery.mock.calls as Array<[Record<string, unknown>]>).map(
      ([params]) => params
    );
    expect(calls).toContainEqual(
      expect.objectContaining({
        index: plan.alertsIndex,
        query: { ids: { values: expect.arrayContaining(['old-alert-1', 'old-alert-2']) } },
      })
    );
    expect(calls).toContainEqual(
      expect.objectContaining({
        index: plan.adhocAttackIndex,
        query: {
          terms: { 'kibana.alert.attack_discovery.alert_ids': ['old-alert-1', 'old-alert-2'] },
        },
      })
    );
    const eventSweep = calls.find(({ index }) => index === 'logs-endpoint.events.fp-tp-*');
    expect(JSON.stringify(eventSweep?.query)).toContain('old-host');
    // entities on the earlier seed's hosts are looked up in the space's alias
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { terms: { 'host.id': expect.arrayContaining(['old-host', ...plan.hostIds]) } },
      })
    );
  });
});

describe('seedTwinLiveServerless', () => {
  const twin = buildEncodedPowershellTwin('fp');
  const SPACE = 'fptp-eval-1';

  const setup = (
    overrides: { bulkResult?: (call: number) => unknown; validateStatus?: string } = {}
  ) => {
    const order: string[] = [];
    let bulkCalls = 0;
    const bulk = jest.fn(async ({ operations }: { operations: unknown[] }) => {
      bulkCalls++;
      const first = operations[0] as { create?: { _index: string }; index?: unknown };
      order.push(`bulk:${first.create?._index ?? 'index-op'}`);
      return overrides.bulkResult ? overrides.bulkResult(bulkCalls) : { errors: false };
    });
    const deleteByQuery = jest.fn(async ({ index }: { index: string }) => {
      order.push(`delete:${index}`);
      return {};
    });
    const esClient = {
      bulk,
      deleteByQuery,
      indices: {
        exists: jest.fn().mockResolvedValue(true),
        putIndexTemplate: jest.fn().mockResolvedValue({ acknowledged: true }),
        createDataStream: jest.fn().mockResolvedValue({ acknowledged: true }),
      },
      ingest: { putPipeline: jest.fn().mockResolvedValue({ acknowledged: true }) },
      search: jest.fn(async ({ index }: { index: string }) =>
        index.startsWith('.adhoc')
          ? { hits: { hits: [{ _id: 'persisted-attack' }] } }
          : { hits: { hits: [] } }
      ),
      updateByQuery: jest.fn().mockResolvedValue({ updated: 1 }),
    } as unknown as EsClientArg;

    const kbnRequest = jest.fn(async ({ method, path }: Parameters<FpTpLiveKbnRequest>[0]) => {
      if (path === '/api/security/entity_store/status') {
        return { statusCode: 200, body: { status: 'running' } };
      }
      if (path === SETTINGS_PATH && method === 'GET') {
        return { statusCode: 200, body: { data: { features: [] } } };
      }
      if (path.startsWith('/api/workflows/workflow/') && method === 'POST') {
        order.push('validate');
        return { statusCode: 200, body: { workflowExecutionId: 'exec-1' } };
      }
      if (path.startsWith('/api/workflows/executions/')) {
        return { statusCode: 200, body: { status: overrides.validateStatus ?? 'completed' } };
      }
      if (path.startsWith('/api/detection_engine/rules') && method === 'GET') {
        return { statusCode: 200, body: {} };
      }
      return { statusCode: 200, body: {} };
    });

    return { esClient, kbnRequest, bulk, deleteByQuery, order };
  };

  const run = (s: ReturnType<typeof setup>) =>
    seedTwinLiveServerless({
      esClient: s.esClient,
      kbnRequest: s.kbnRequest,
      twin,
      space: SPACE,
      reasoningConnectorId: 'conn-1',
      now: NOW,
    });

  it('cleans up before it writes, and writes alerts and events with create operations', async () => {
    skipSleeps();
    const s = setup();

    const { summary } = await run(s);

    const firstWrite = s.order.findIndex((entry) => entry.startsWith('bulk:'));
    const firstDelete = s.order.findIndex((entry) => entry.startsWith('delete:'));
    expect(firstDelete).toBeGreaterThanOrEqual(0);
    expect(firstDelete).toBeLessThan(firstWrite);
    expect(s.order).toContain(`bulk:.alerts-security.alerts-${SPACE}`);
    expect(s.order).toContain(`bulk:logs-endpoint.events.fp-tp-process-${SPACE}`);
    for (const [{ operations }] of s.bulk.mock.calls as Array<[{ operations: unknown[] }]>) {
      const headers = operations.filter((_, position) => position % 2 === 0) as Array<
        Record<string, unknown>
      >;
      expect(headers.every((header) => 'create' in header && !('index' in header))).toBe(true);
    }
    expect(summary.attackId).toBe('persisted-attack');
    expect(summary.attackIndex).toBe(`.adhoc.alerts-security.attack.discovery.alerts-${SPACE}`);
  });

  it('provisions the raw-event store and attaches the ingest pipeline to the events bulk', async () => {
    skipSleeps();
    const s = setup();
    const es = s.esClient as unknown as {
      indices: {
        putIndexTemplate: jest.Mock;
        createDataStream: jest.Mock;
      };
      ingest: { putPipeline: jest.Mock };
    };

    await run(s);

    // the seeder-owned template and stream exist before the events bulk runs,
    // and the bulk targets the stream through the pipeline
    expect(es.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ name: FP_TP_RAW_EVENT_INDEX_TEMPLATE })
    );
    expect(es.indices.createDataStream.mock.calls.map(([params]) => params.name)).toEqual(
      expect.arrayContaining([`logs-endpoint.events.fp-tp-process-${SPACE}`])
    );
    for (const [params] of es.indices.createDataStream.mock.calls as Array<
      [Record<string, unknown>]
    >) {
      expect(params.name).toMatch(/^logs-endpoint\.events\.fp-tp-/);
    }
    const eventsBulk = s.bulk.mock.calls
      .map(([params]) => params)
      .find((params) =>
        (params.operations[0] as { create?: { _index: string } }).create?._index.startsWith(
          'logs-endpoint.events.'
        )
      ) as { pipeline?: string };
    expect(eventsBulk.pipeline).toBe(FP_TP_RAW_EVENT_INGEST_PIPELINE);
    const eventsBulkAt = s.order.indexOf(`bulk:logs-endpoint.events.fp-tp-process-${SPACE}`);
    expect(s.deleteByQuery.mock.calls.length).toBeGreaterThan(0);
    expect(eventsBulkAt).toBeGreaterThan(0);
  });

  it('passes the inference action type to the validate workflow', async () => {
    skipSleeps();
    const s = setup();

    await run(s);

    const start = (s.kbnRequest.mock.calls as Array<[Parameters<FpTpLiveKbnRequest>[0]]>)
      .map(([call]) => call)
      .find((call) => call.method === 'POST' && call.path.startsWith('/api/workflows/workflow/'));
    expect((start?.body as { inputs: { api_config: unknown } }).inputs.api_config).toEqual({
      connector_id: 'conn-1',
      action_type_id: '.inference',
    });
  });

  it('refuses the default space before touching anything', async () => {
    const s = setup();
    await expect(
      seedTwinLiveServerless({
        esClient: s.esClient,
        kbnRequest: s.kbnRequest,
        twin,
        space: 'default',
        reasoningConnectorId: 'conn-1',
        now: NOW,
      })
    ).rejects.toThrow(/refuses the default space/);
    expect(s.kbnRequest).not.toHaveBeenCalled();
    expect(s.bulk).not.toHaveBeenCalled();
  });

  it('cleans up and rethrows when a bulk reports item errors', async () => {
    skipSleeps();
    const s = setup({
      bulkResult: (call) =>
        call === 1 ? { errors: true, items: [{ create: { status: 409 } }] } : {},
    });
    const deletesBeforeBulk = () => s.deleteByQuery.mock.calls.length;

    await expect(run(s)).rejects.toThrow(/alerts bulk had item errors/);

    // initial cleanup + the cleanup run by the failure handler
    expect(deletesBeforeBulk()).toBeGreaterThan(0);
    const bulkAt = s.order.findIndex((entry) => entry.startsWith('bulk:'));
    expect(s.order.slice(bulkAt + 1).some((entry) => entry.startsWith('delete:'))).toBe(true);
  });

  it('cleans up and throws when the validate execution fails', async () => {
    skipSleeps();
    const s = setup({ validateStatus: 'failed' });

    await expect(run(s)).rejects.toThrow(/ended "failed"/);

    const validateAt = s.order.indexOf('validate');
    expect(s.order.slice(validateAt + 1).some((entry) => entry.startsWith('delete:'))).toBe(true);
  });
});
