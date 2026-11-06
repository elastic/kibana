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

const DEFAULT_CONNECTOR_SETTING = 'genAiSettings:defaultAIConnector';
const DEFAULT_ONLY_SETTING = 'genAiSettings:defaultAIConnectorOnly';

interface MockOverrides {
  /** Connector a tier resolves to, keyed by `<spaceId>/<featureId>`. Others follow the bridge. */
  tierResolutionOverrides?: Record<string, string | undefined>;
  threatIntelSupplyBySpace?: Record<
    string,
    { huntEnabled?: boolean; hardGateOk?: boolean; drift?: boolean }
  >;
  enableWorkerErrorSpaces?: string[];
  builtInRoleMissing?: boolean;
  /** `genAiSettings:defaultAIConnector` user value already set in a space before the preflight. */
  previousDefaultConnectorBySpace?: Record<string, string>;
  /** `genAiSettings:defaultAIConnectorOnly` user value already set in a space before the preflight. */
  previousDefaultOnlyBySpace?: Record<string, boolean>;
  /** Spaces whose bridge and restore settings writes fail (index-scope writes still succeed). */
  settingsWriteErrorSpaces?: string[];
  /** Spaces that already exist, keyed by id, as the spaces GET returns them. Others 404. */
  existingSpaces?: Record<string, Record<string, unknown>>;
  /** Receives every create (POST) and update (PUT) body sent to the spaces API. */
  spaceWrites?: Array<{ method: string; path: string; body: Record<string, unknown> }>;
  /** Receives every `changes` body POSTed to a space's settings route, keyed by space id. */
  settingsWrites?: Array<{ spaceId: string; changes: Record<string, unknown> }>;
}

const buildMockFetch = (overrides: MockOverrides = {}): HttpHandler => {
  const {
    tierResolutionOverrides = {},
    threatIntelSupplyBySpace = {},
    enableWorkerErrorSpaces = [],
    builtInRoleMissing = false,
    previousDefaultConnectorBySpace = {},
    previousDefaultOnlyBySpace = {},
    settingsWriteErrorSpaces = [],
    settingsWrites = [],
    existingSpaces,
    spaceWrites = [],
  } = overrides;

  // What the bridge last wrote per space, so the connectors route can follow it like the server.
  const currentSettings: Record<string, Record<string, unknown>> = {};

  return jest.fn(async (...args: unknown[]) => {
    const first = args[0];
    interface Options {
      method?: string;
      body?: string;
      query?: Record<string, string>;
    }
    const {
      path,
      method = 'GET',
      body,
      query,
    }: Options & { path: string } = typeof first === 'string'
      ? { path: first, ...(args[1] as Options | undefined) }
      : (first as Options & { path: string });

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
        const settings: Record<string, { userValue: unknown }> = {};
        const previousConnector = previousDefaultConnectorBySpace[spaceId];
        if (previousConnector)
          settings[DEFAULT_CONNECTOR_SETTING] = { userValue: previousConnector };
        const previousOnly = previousDefaultOnlyBySpace[spaceId];
        if (previousOnly !== undefined)
          settings[DEFAULT_ONLY_SETTING] = { userValue: previousOnly };
        return { settings };
      }
      const { changes } = JSON.parse(body ?? '{}') as { changes: Record<string, unknown> };
      settingsWrites.push({ spaceId, changes });
      if (settingsWriteErrorSpaces.includes(spaceId) && DEFAULT_CONNECTOR_SETTING in changes) {
        throw Object.assign(new Error('Bad Request'), { status: 400 });
      }
      currentSettings[spaceId] = { ...currentSettings[spaceId], ...changes };
      return {};
    }
    const connectorsMatch = /^\/s\/([^/]+)\/internal\/search_inference_endpoints\/connectors$/.exec(
      path
    );
    if (connectorsMatch && method === 'GET') {
      const spaceId = decodeURIComponent(connectorsMatch[1]);
      const key = `${spaceId}/${query?.featureId}`;
      const current = currentSettings[spaceId] ?? {};
      // Without `defaultAIConnectorOnly` the tiers fall to their recommended endpoints.
      const resolved =
        key in tierResolutionOverrides
          ? tierResolutionOverrides[key]
          : current[DEFAULT_ONLY_SETTING] === true
          ? (current[DEFAULT_CONNECTOR_SETTING] as string)
          : 'recommended-endpoint';
      return { connectors: resolved ? [{ connectorId: resolved }] : [], soEntryFound: false };
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

const run = (
  fetch: HttpHandler,
  options: { isServerless?: boolean; connectorId?: string; subjectInferenceId?: string } = {}
) =>
  runPreflight({
    fetch,
    log: new ToolingLog(),
    connectorId: CONNECTOR.id,
    evaluationConnector: JUDGE_CONNECTOR,
    ...options,
  });

/** The last value written per space for one setting: the bridge writes first, the restore last. */
const lastWrite = (
  settingsWrites: NonNullable<MockOverrides['settingsWrites']>,
  setting: string
): Record<string, unknown> =>
  Object.fromEntries(
    settingsWrites
      .filter(({ changes }) => setting in changes)
      .map(({ spaceId, changes }) => [spaceId, changes[setting]])
  );

describe('runPreflight', () => {
  const originalCi = process.env.CI;
  beforeEach(() => {
    process.env.CI = 'true';
  });
  afterEach(() => {
    if (originalCi === undefined) delete process.env.CI;
    else process.env.CI = originalCi;
  });

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
    expect(firstAlertZero).toBeGreaterThan(-1);
    expect(lastSpaceWrite).toBeLessThan(firstAlertZero);
  });

  it('creates missing non-default eval spaces on serverless without a solution view', async () => {
    const spaceWrites: MockOverrides['spaceWrites'] = [];
    await run(
      buildMockFetch({
        existingSpaces: { default: { id: 'default', name: 'Default' } },
        spaceWrites,
      }),
      { isServerless: true }
    );

    const created = spaceWrites.filter(({ method }) => method === 'POST');
    expect(created.map(({ body }) => body.id).sort()).toEqual(['hunt-a', 'hunt-b', 'hunt-blocked']);
    for (const { body } of created) {
      expect(body).not.toHaveProperty('solution');
    }
    // Existing serverless spaces (`default`) are never converted.
    expect(spaceWrites.filter(({ method }) => method === 'PUT')).toEqual([]);
  });

  it('refuses to convert a Classic default space outside CI, before writing anything', async () => {
    delete process.env.CI;
    const spaceWrites: MockOverrides['spaceWrites'] = [];
    const settingsWrites: MockOverrides['settingsWrites'] = [];
    await expect(
      run(
        buildMockFetch({
          existingSpaces: { default: { id: 'default', name: 'Default', solution: 'classic' } },
          spaceWrites,
          settingsWrites,
        })
      )
    ).rejects.toThrow(/"default" space uses the "classic" solution view/);
    expect(spaceWrites).toEqual([]);
    expect(settingsWrites).toEqual([]);
  });

  it.each(['false', '0'])('treats CI=%s as outside CI', async (ci) => {
    process.env.CI = ci;
    await expect(
      run(
        buildMockFetch({
          existingSpaces: { default: { id: 'default', name: 'Default', solution: 'classic' } },
        })
      )
    ).rejects.toThrow(/"default" space uses the "classic" solution view/);
  });

  it('still converts the non-default eval spaces outside CI', async () => {
    delete process.env.CI;
    const spaceWrites: MockOverrides['spaceWrites'] = [];
    await run(
      buildMockFetch({
        existingSpaces: {
          default: { id: 'default', name: 'Default', solution: 'security' },
          'hunt-a': { id: 'hunt-a', name: 'hunt-a', solution: 'classic' },
          'hunt-b': { id: 'hunt-b', name: 'hunt-b', solution: 'security' },
          'hunt-blocked': { id: 'hunt-blocked', name: 'hunt-blocked' },
        },
        spaceWrites,
      })
    );
    expect(spaceWrites.filter(({ method }) => method === 'PUT').map(({ path }) => path)).toEqual([
      '/api/spaces/space/hunt-a',
      '/api/spaces/space/hunt-blocked',
    ]);
  });

  it('pins every eval space to the subject connector only, so the tiers cannot fall back to their recommended models', async () => {
    const settingsWrites: MockOverrides['settingsWrites'] = [];
    await run(buildMockFetch({ settingsWrites }));

    const bridged = settingsWrites.filter(({ changes }) => DEFAULT_ONLY_SETTING in changes);
    expect(bridged.map(({ spaceId }) => spaceId)).toEqual([...EVAL_SPACE_IDS]);
    for (const { changes } of bridged) {
      expect(changes).toEqual({
        [DEFAULT_CONNECTOR_SETTING]: CONNECTOR.id,
        [DEFAULT_ONLY_SETTING]: true,
      });
    }
  });

  it('restores both bridged settings in each space to their previous values, not to null', async () => {
    const settingsWrites: MockOverrides['settingsWrites'] = [];
    const cleanup = await run(
      buildMockFetch({
        previousDefaultConnectorBySpace: { default: 'developer-connector' },
        previousDefaultOnlyBySpace: { default: false, 'hunt-a': true },
        settingsWrites,
      })
    );
    settingsWrites.length = 0;
    await cleanup();

    expect(lastWrite(settingsWrites, DEFAULT_CONNECTOR_SETTING)).toEqual({
      default: 'developer-connector',
      'hunt-a': null,
      'hunt-b': null,
      'hunt-blocked': null,
    });
    expect(lastWrite(settingsWrites, DEFAULT_ONLY_SETTING)).toEqual({
      default: false,
      'hunt-a': true,
      'hunt-b': null,
      'hunt-blocked': null,
    });
  });

  it('restores both bridged settings in every space when a gate after the bridge throws', async () => {
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

    expect(lastWrite(settingsWrites, DEFAULT_CONNECTOR_SETTING)).toEqual({
      default: 'developer-connector',
      'hunt-a': null,
      'hunt-b': null,
      'hunt-blocked': null,
    });
    expect(lastWrite(settingsWrites, DEFAULT_ONLY_SETTING)).toEqual({
      default: null,
      'hunt-a': null,
      'hunt-b': null,
      'hunt-blocked': null,
    });
  });

  it('restores the spaces already bridged, and only those, when a bridge write fails partway', async () => {
    const settingsWrites: MockOverrides['settingsWrites'] = [];
    const [first, second] = EVAL_SPACE_IDS;
    await expect(
      run(
        buildMockFetch({
          previousDefaultConnectorBySpace: { [first]: 'developer-connector' },
          // Fails the bridge write in the second space; the restore write there fails too.
          settingsWriteErrorSpaces: [second],
          settingsWrites,
        })
      )
    ).rejects.toThrow(/Bad Request/);

    const connectorWrites = settingsWrites.filter(
      ({ changes }) => DEFAULT_CONNECTOR_SETTING in changes
    );
    // Bridge: first, second (fails). Restore: first, second. The later spaces are never touched.
    expect(connectorWrites.map(({ spaceId }) => spaceId)).toEqual([first, second, first, second]);
    expect(lastWrite(settingsWrites, DEFAULT_CONNECTOR_SETTING)).toEqual({
      [first]: 'developer-connector',
      [second]: null,
    });
  });

  it('throws naming the tier, the space and the model it resolves to when a tier does not resolve to the subject', async () => {
    await expect(
      run(
        buildMockFetch({
          tierResolutionOverrides: { 'hunt-b/alertzero_frontier': 'gpt-6-sol' },
        })
      )
    ).rejects.toThrow(/tier "alertzero_frontier" resolves to "gpt-6-sol" in space "hunt-b"/);
  });

  it('throws when a tier resolves to no connector at all', async () => {
    await expect(
      run(buildMockFetch({ tierResolutionOverrides: { 'default/alertzero_efficient': undefined } }))
    ).rejects.toThrow(/tier "alertzero_efficient" resolves to "no connector" in space "default"/);
  });

  it('restores both bridged settings and never enables the Worker when a tier does not resolve to the subject', async () => {
    const settingsWrites: MockOverrides['settingsWrites'] = [];
    const calls: string[] = [];
    const inner = buildMockFetch({
      tierResolutionOverrides: { 'hunt-a/alertzero_balanced': 'gpt-6-luna' },
      settingsWrites,
    }) as unknown as jest.Mock;
    const fetch = jest.fn(async (...args: unknown[]) => {
      const first = args[0];
      const path = typeof first === 'string' ? first : (first as { path: string }).path;
      const method = (args[1] as { method?: string } | undefined)?.method ?? 'GET';
      calls.push(`${method} ${path}`);
      return inner(...args);
    }) as unknown as HttpHandler;

    await expect(run(fetch)).rejects.toThrow(/alertzero_balanced/);

    expect(calls.filter((c) => c.startsWith('PATCH '))).toEqual([]);
    for (const setting of [DEFAULT_CONNECTOR_SETTING, DEFAULT_ONLY_SETTING]) {
      expect(lastWrite(settingsWrites, setting)).toEqual(
        Object.fromEntries(EVAL_SPACE_IDS.map((spaceId) => [spaceId, null]))
      );
    }
  });

  it('accepts a tier that resolves to the inference endpoint behind a .inference stack connector', async () => {
    await expect(
      run(
        buildMockFetch({
          tierResolutionOverrides: Object.fromEntries(
            EVAL_SPACE_IDS.flatMap((spaceId) =>
              ['alertzero_efficient', 'alertzero_balanced', 'alertzero_frontier'].map(
                (featureId) => [`${spaceId}/${featureId}`, 'subject-endpoint']
              )
            )
          ),
        }),
        { connectorId: 'subject-stack-connector', subjectInferenceId: 'subject-endpoint' }
      )
    ).resolves.toEqual(expect.any(Function));
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
