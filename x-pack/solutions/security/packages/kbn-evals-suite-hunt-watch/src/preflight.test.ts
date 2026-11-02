/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { ToolingLog } from '@kbn/tooling-log';
import type { EvalConnector } from '@kbn/evals';
import { runPreflight } from './preflight';
import { EVAL_SPACE_IDS } from './constants';

const CONNECTOR: EvalConnector = {
  type: 'inference_endpoint',
  id: 'subject-connector',
  name: 'Subject Connector',
  inferenceId: 'subject-connector',
  provider: 'elastic',
  taskType: 'completion',
};

const JUDGE_CONNECTOR: EvalConnector = {
  type: 'inference_endpoint',
  id: 'judge-connector',
  name: 'Judge Connector',
  inferenceId: 'judge-connector',
  provider: 'elastic',
  taskType: 'completion',
};

interface InferenceFeature {
  feature_id: string;
  endpoints: Array<{ id: string }>;
}

interface MockOverrides {
  /** Inference feature picks each space has before the preflight, keyed by space id. */
  initialInferenceFeaturesBySpace?: Record<string, InferenceFeature[]>;
  /** Receives every inference-settings PUT, keyed by space id. */
  inferenceWrites?: Array<{ spaceId: string; features: InferenceFeature[] }>;
  /** Accept inference-settings PUTs without storing them, so the read-back sees the old picks. */
  dropInferenceWrites?: boolean;
  threatIntelSupplyBySpace?: Record<
    string,
    { huntEnabled?: boolean; hardGateOk?: boolean; drift?: boolean }
  >;
  enableWorkerErrorSpaces?: string[];
  builtInRoleMissing?: boolean;
  /** `genAiSettings:defaultAIConnector` user value already set in a space before the preflight. */
  previousDefaultConnectorBySpace?: Record<string, string>;
  /** Spaces that already exist, keyed by id, as the spaces GET returns them. Others 404. */
  existingSpaces?: Record<string, Record<string, unknown>>;
  /** Receives every create (POST) and update (PUT) body sent to the spaces API. */
  spaceWrites?: Array<{ method: string; path: string; body: Record<string, unknown> }>;
  /** Receives every `changes` body POSTed to a space's settings route, keyed by space id. */
  settingsWrites?: Array<{ spaceId: string; changes: Record<string, unknown> }>;
}

const buildMockFetch = (overrides: MockOverrides = {}): HttpHandler => {
  const {
    initialInferenceFeaturesBySpace = {},
    inferenceWrites = [],
    dropInferenceWrites = false,
    threatIntelSupplyBySpace = {},
    enableWorkerErrorSpaces = [],
    builtInRoleMissing = false,
    previousDefaultConnectorBySpace = {},
    settingsWrites = [],
    existingSpaces,
    spaceWrites = [],
  } = overrides;

  const inferenceFeaturesBySpace = new Map<string, InferenceFeature[]>(
    Object.entries(initialInferenceFeaturesBySpace)
  );

  return jest.fn(async (...args: unknown[]) => {
    const first = args[0];
    const {
      path,
      method = 'GET',
      body,
    }: { path: string; method?: string; body?: string } = typeof first === 'string'
      ? { path: first, ...(args[1] as { method?: string; body?: string } | undefined) }
      : (first as { path: string; method?: string; body?: string });

    if (/^\/api\/spaces\/space\/[^/]+$/.test(path) && method === 'GET') {
      const id = decodeURIComponent(path.split('/').pop() as string);
      // By default every eval space already exists as a Security space.
      if (!existingSpaces) return { id, name: id, solution: 'security' };
      if (existingSpaces[id]) return existingSpaces[id];
      throw Object.assign(new Error('Not Found'), { status: 404 });
    }
    if (/^\/api\/spaces\/space(\/[^/]+)?$/.test(path) && (method === 'POST' || method === 'PUT')) {
      spaceWrites.push({ method, path, body: JSON.parse(body ?? '{}') });
      return {};
    }
    if (/^\/api\/security\/role\/[^/]+$/.test(path) && method === 'GET') {
      if (builtInRoleMissing) {
        throw Object.assign(new Error('Not Found'), { status: 404 });
      }
      // The Worker's built-in role ships with Elasticsearch; only its presence is checked.
      return { metadata: { _reserved: true } };
    }
    if (path === '/internal/security/service_account' && method === 'GET') {
      // No account exists yet, so `ensureWorkerServiceAccount` creates one below.
      return { serviceAccounts: [] };
    }
    if (path === '/internal/security/service_account' && method === 'POST') {
      return { id: 'mock-service-account-id' };
    }
    const settingsMatch = /^(?:\/s\/([^/]+))?\/internal\/kibana\/settings$/.exec(path);
    if (settingsMatch) {
      const spaceId = settingsMatch[1] ? decodeURIComponent(settingsMatch[1]) : 'default';
      if (method === 'GET') {
        const previous = previousDefaultConnectorBySpace[spaceId];
        return {
          settings: previous ? { 'genAiSettings:defaultAIConnector': { userValue: previous } } : {},
        };
      }
      settingsWrites.push({
        spaceId,
        changes: (JSON.parse(body ?? '{}') as { changes: Record<string, unknown> }).changes,
      });
      return {};
    }
    const inferenceMatch =
      /^(?:\/s\/([^/]+))?\/internal\/search_inference_endpoints\/settings$/.exec(path);
    if (inferenceMatch) {
      const spaceId = inferenceMatch[1] ? decodeURIComponent(inferenceMatch[1]) : 'default';
      if (method === 'PUT') {
        const { features } = JSON.parse(body ?? '{}') as { features: InferenceFeature[] };
        inferenceWrites.push({ spaceId, features });
        if (!dropInferenceWrites) inferenceFeaturesBySpace.set(spaceId, features);
        return { data: { features } };
      }
      return { data: { features: inferenceFeaturesBySpace.get(spaceId) ?? [] } };
    }
    if (/\/internal\/alertzero\/workers$/.test(path) && method === 'GET') {
      return {
        workers: [{ id: 'system-security-hunt-continuous-threat-hunt', settingsRevision: 1 }],
      };
    }
    const workerPatchMatch = /^\/s\/([^/]+)\/internal\/alertzero\/workers\/[^/]+$/.exec(path);
    if (workerPatchMatch && method === 'PATCH') {
      const spaceId = decodeURIComponent(workerPatchMatch[1]);
      if (enableWorkerErrorSpaces.includes(spaceId)) {
        throw new Error(
          `AlertZero Hunt Watch Worker cannot be turned on because no AI model is available (noModel)`
        );
      }
      return { worker: { id: 'system-security-hunt-continuous-threat-hunt' } };
    }
    const supplyMatch = /^\/s\/([^/]+)\/internal\/alertzero\/hunt\/threat_intel_supply$/.exec(path);
    if (supplyMatch) {
      const spaceId = decodeURIComponent(supplyMatch[1]);
      const override = threatIntelSupplyBySpace[spaceId] ?? {};
      return {
        workflows: [],
        hardGate: {
          ok: override.hardGateOk ?? true,
          reasonCodes: override.hardGateOk === false ? ['no_embeddings'] : [],
        },
        drift: override.drift ?? false,
        huntEnabled: override.huntEnabled ?? true,
      };
    }
    if (path === '/api/security/entity_store/status') {
      return { status: 'running' };
    }
    if (path === '/api/security/entity_store/install') {
      return {};
    }
    if (/\/internal\/_inference\/_exists\//.test(path)) {
      return { isEndpointExists: true };
    }

    throw new Error(`Unexpected fetch call: ${method} ${path}`);
  }) as unknown as HttpHandler;
};

const run = (fetch: HttpHandler) =>
  runPreflight({
    fetch,
    log: new ToolingLog(),
    connectorId: CONNECTOR.id,
    evaluationConnector: JUDGE_CONNECTOR,
  });

describe('runPreflight', () => {
  it('resolves and returns a cleanup function on a healthy stack', async () => {
    const cleanup = await run(buildMockFetch());
    expect(typeof cleanup).toBe('function');
  });

  it('creates missing eval spaces with the Security solution view', async () => {
    const spaceWrites: MockOverrides['spaceWrites'] = [];
    await run(
      buildMockFetch({
        existingSpaces: { default: { id: 'default', name: 'Default', solution: 'security' } },
        spaceWrites,
      })
    );

    const created = spaceWrites.filter(({ method }) => method === 'POST');
    expect(created.map(({ body }) => body.id).sort()).toEqual(['hunt-a', 'hunt-b', 'hunt-blocked']);
    for (const { body } of created) {
      expect(body.solution).toBe('security');
    }
    expect(spaceWrites.filter(({ method }) => method === 'PUT')).toEqual([]);
  });

  it('switches existing Classic spaces, including default, to Security and preserves their fields', async () => {
    const spaceWrites: MockOverrides['spaceWrites'] = [];
    await run(
      buildMockFetch({
        existingSpaces: {
          default: {
            id: 'default',
            name: 'Default',
            color: '#00bfb3',
            disabledFeatures: ['maps'],
            _reserved: true,
          },
          'hunt-a': { id: 'hunt-a', name: 'hunt-a', disabledFeatures: [], solution: 'classic' },
          'hunt-b': { id: 'hunt-b', name: 'hunt-b', disabledFeatures: [], solution: 'security' },
          'hunt-blocked': { id: 'hunt-blocked', name: 'hunt-blocked', disabledFeatures: [] },
        },
        spaceWrites,
      })
    );

    expect(spaceWrites.filter(({ method }) => method === 'POST')).toEqual([]);
    const updated = spaceWrites.filter(({ method }) => method === 'PUT');
    // `hunt-b` is already a Security space, so it is left untouched.
    expect(updated.map(({ path }) => path).sort()).toEqual([
      '/api/spaces/space/default',
      '/api/spaces/space/hunt-a',
      '/api/spaces/space/hunt-blocked',
    ]);
    for (const { body } of updated) {
      expect(body.solution).toBe('security');
    }
    expect(updated.find(({ path }) => path.endsWith('/default'))?.body).toEqual({
      id: 'default',
      name: 'Default',
      color: '#00bfb3',
      disabledFeatures: ['maps'],
      _reserved: true,
      solution: 'security',
    });
  });

  it('makes every eval space a Security space before the first AlertZero call', async () => {
    const calls: string[] = [];
    const inner = buildMockFetch({
      existingSpaces: { default: { id: 'default', name: 'Default' } },
    }) as unknown as jest.Mock;
    const fetch = jest.fn(async (...args: unknown[]) => {
      const first = args[0];
      const path = typeof first === 'string' ? first : (first as { path: string }).path;
      const method = (args[1] as { method?: string } | undefined)?.method ?? 'GET';
      calls.push(`${method} ${path}`);
      return inner(...args);
    }) as unknown as HttpHandler;
    await run(fetch);

    const firstAlertZero = calls.findIndex((c) => c.includes('/internal/alertzero/'));
    const lastSpaceWrite = calls.reduce(
      (idx, c, i) => (/^(POST|PUT) \/api\/spaces\/space/.test(c) ? i : idx),
      -1
    );
    expect(lastSpaceWrite).toBeGreaterThan(-1);
    expect(lastSpaceWrite).toBeLessThan(firstAlertZero);
  });

  it('restores each space to the default connector it had before the bridge, not to null', async () => {
    const settingsWrites: MockOverrides['settingsWrites'] = [];
    const cleanup = await run(
      buildMockFetch({
        previousDefaultConnectorBySpace: { default: 'developer-connector' },
        settingsWrites,
      })
    );
    settingsWrites.length = 0;
    await cleanup();

    const restored = Object.fromEntries(
      settingsWrites.map(({ spaceId, changes }) => [
        spaceId,
        changes['genAiSettings:defaultAIConnector'],
      ])
    );
    expect(restored).toEqual({
      default: 'developer-connector',
      'hunt-a': null,
      'hunt-b': null,
      'hunt-blocked': null,
    });
  });

  it('routes every alertzero tier to the subject connector in every eval space and keeps other picks', async () => {
    const inferenceWrites: MockOverrides['inferenceWrites'] = [];
    await run(
      buildMockFetch({
        initialInferenceFeaturesBySpace: {
          default: [
            { feature_id: 'agent_builder', endpoints: [{ id: 'developer-endpoint' }] },
            { feature_id: 'alertzero_frontier', endpoints: [{ id: 'recommended-opus' }] },
          ],
        },
        inferenceWrites,
      })
    );

    expect(inferenceWrites.map(({ spaceId }) => spaceId).sort()).toEqual(
      [...EVAL_SPACE_IDS].sort()
    );
    for (const { features } of inferenceWrites) {
      for (const tier of ['alertzero_efficient', 'alertzero_balanced', 'alertzero_frontier']) {
        expect(features.filter(({ feature_id: id }) => id === tier)).toEqual([
          { feature_id: tier, endpoints: [{ id: CONNECTOR.id }] },
        ]);
      }
    }
    expect(inferenceWrites.find(({ spaceId }) => spaceId === 'default')?.features).toContainEqual({
      feature_id: 'agent_builder',
      endpoints: [{ id: 'developer-endpoint' }],
    });
  });

  it('throws naming the tier and space when the tier pick does not read back', async () => {
    await expect(run(buildMockFetch({ dropInferenceWrites: true }))).rejects.toThrow(
      /did not stick in space "default" for alertzero_efficient, alertzero_balanced, alertzero_frontier/
    );
  });

  it('restores the previous tier picks in every space after the run', async () => {
    const inferenceWrites: MockOverrides['inferenceWrites'] = [];
    const developerPicks = [
      { feature_id: 'alertzero_frontier', endpoints: [{ id: 'developer-endpoint' }] },
    ];
    const cleanup = await run(
      buildMockFetch({
        initialInferenceFeaturesBySpace: { default: developerPicks },
        inferenceWrites,
      })
    );
    inferenceWrites.length = 0;
    await cleanup();

    expect(
      Object.fromEntries(inferenceWrites.map(({ spaceId, features }) => [spaceId, features]))
    ).toEqual({ default: developerPicks, 'hunt-a': [], 'hunt-b': [], 'hunt-blocked': [] });
  });

  it('restores the previous connector and tier picks when the tier read-back throws', async () => {
    const settingsWrites: MockOverrides['settingsWrites'] = [];
    const inferenceWrites: MockOverrides['inferenceWrites'] = [];
    await expect(
      run(
        buildMockFetch({
          dropInferenceWrites: true,
          previousDefaultConnectorBySpace: { default: 'developer-connector' },
          settingsWrites,
          inferenceWrites,
        })
      )
    ).rejects.toThrow(/did not stick/);

    const lastConnectorWrite = Object.fromEntries(
      settingsWrites
        .filter(({ changes }) => 'genAiSettings:defaultAIConnector' in changes)
        .map(({ spaceId, changes }) => [spaceId, changes['genAiSettings:defaultAIConnector']])
    );
    expect(lastConnectorWrite).toEqual({
      default: 'developer-connector',
      'hunt-a': null,
      'hunt-b': null,
      'hunt-blocked': null,
    });
    const lastInferenceWrite = Object.fromEntries(
      inferenceWrites.map(({ spaceId, features }) => [spaceId, features])
    );
    expect(lastInferenceWrite).toEqual({
      default: [],
      'hunt-a': [],
      'hunt-b': [],
      'hunt-blocked': [],
    });
  });

  it('restores the previous connector in every space when a gate after the bridge throws', async () => {
    const settingsWrites: MockOverrides['settingsWrites'] = [];
    await expect(
      run(
        buildMockFetch({
          previousDefaultConnectorBySpace: { default: 'developer-connector' },
          threatIntelSupplyBySpace: { [EVAL_SPACE_IDS[0]]: { hardGateOk: false } },
          settingsWrites,
        })
      )
    ).rejects.toThrow(/hardGate\.ok=false/);

    // Last connector write per space wins: the bridge sets the subject connector, the failed
    // preflight must put the previous value back.
    const lastConnectorWrite = Object.fromEntries(
      settingsWrites
        .filter(({ changes }) => 'genAiSettings:defaultAIConnector' in changes)
        .map(({ spaceId, changes }) => [spaceId, changes['genAiSettings:defaultAIConnector']])
    );
    expect(lastConnectorWrite).toEqual({
      default: 'developer-connector',
      'hunt-a': null,
      'hunt-b': null,
      'hunt-blocked': null,
    });
  });

  it('throws naming the built-in role when Elasticsearch does not ship it', async () => {
    await expect(run(buildMockFetch({ builtInRoleMissing: true }))).rejects.toThrow(
      /no built-in "alertzero_threat_hunt" role/
    );
  });

  it('throws when TI supply hardGate.ok is false in an eval space', async () => {
    await expect(
      run(
        buildMockFetch({
          threatIntelSupplyBySpace: { [EVAL_SPACE_IDS[0]]: { hardGateOk: false } },
        })
      )
    ).rejects.toThrow(/hardGate\.ok=false/);
  });

  it('throws when TI supply reports drift in an eval space', async () => {
    await expect(
      run(buildMockFetch({ threatIntelSupplyBySpace: { [EVAL_SPACE_IDS[0]]: { drift: true } } }))
    ).rejects.toThrow(/drift=true/);
  });

  it('throws naming the space and the noModel gate when enabling the Worker is refused', async () => {
    await expect(
      run(buildMockFetch({ enableWorkerErrorSpaces: [EVAL_SPACE_IDS[0]] }))
    ).rejects.toThrow(/noModel/);
  });
});
