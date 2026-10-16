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

interface MockOverrides {
  tierFeaturesWithEndpoint?: string[];
  threatIntelSupplyBySpace?: Record<
    string,
    { huntEnabled?: boolean; hardGateOk?: boolean; drift?: boolean }
  >;
  enableWorkerErrorSpaces?: string[];
  builtInRoleMissing?: boolean;
  /** `genAiSettings:defaultAIConnector` user value already set in a space before the preflight. */
  previousDefaultConnectorBySpace?: Record<string, string>;
  /** Receives every `changes` body POSTed to a space's settings route, keyed by space id. */
  settingsWrites?: Array<{ spaceId: string; changes: Record<string, unknown> }>;
}

const buildMockFetch = (overrides: MockOverrides = {}): HttpHandler => {
  const {
    tierFeaturesWithEndpoint = [],
    threatIntelSupplyBySpace = {},
    enableWorkerErrorSpaces = [],
    builtInRoleMissing = false,
    previousDefaultConnectorBySpace = {},
    settingsWrites = [],
  } = overrides;

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
      // Every eval space already exists — space-creation is not under test here.
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
    if (/\/internal\/search_inference_endpoints\/settings$/.test(path)) {
      return {
        data: {
          features: tierFeaturesWithEndpoint.map((featureId) => ({
            feature_id: featureId,
            endpoints: [{ id: 'some-endpoint' }],
          })),
        },
      };
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

  it('throws naming the assigned tier feature when an alertzero_* tier endpoint is already assigned', async () => {
    await expect(
      run(buildMockFetch({ tierFeaturesWithEndpoint: ['alertzero_efficient'] }))
    ).rejects.toThrow(/alertzero_efficient/);
  });

  it('writes no subject connector to any space when a tier endpoint is assigned', async () => {
    const settingsWrites: MockOverrides['settingsWrites'] = [];
    await expect(
      run(buildMockFetch({ tierFeaturesWithEndpoint: ['alertzero_efficient'], settingsWrites }))
    ).rejects.toThrow(/alertzero_efficient/);
    expect(
      settingsWrites.filter(({ changes }) => 'genAiSettings:defaultAIConnector' in changes)
    ).toEqual([]);
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
