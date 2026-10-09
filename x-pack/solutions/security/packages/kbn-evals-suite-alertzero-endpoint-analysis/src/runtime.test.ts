/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import {
  ALERTZERO_AGENTIC_INFERENCE_FEATURE_ID,
  WORKER_ROLE_DEFINITIONS,
} from '@kbn/alertzero-common';
import {
  AlertZeroRuntime,
  installWorkerAndPinConnector,
  pinAgenticConnector,
  runAllCleanups,
  seedAlertZeroEndpoint,
} from './runtime';
import { ExecutionStatus } from '@kbn/workflows';

const createEs = () => {
  const es = {
    indices: {
      create: jest.fn(async () => ({})),
      delete: jest.fn(async () => ({})),
      putIndexTemplate: jest.fn(async () => ({})),
      createDataStream: jest.fn(async () => ({})),
      deleteDataStream: jest.fn(async () => ({})),
      deleteIndexTemplate: jest.fn(async () => ({})),
    },
    index: jest.fn(async () => ({})),
    delete: jest.fn(async () => ({})),
  };
  return es as typeof es & Client;
};

type FetchMock = jest.Mock & HttpHandler;
const createFetch = (impl?: (path: string, options?: { method?: string }) => unknown) =>
  jest.fn(async (path: string, options?: { method?: string }) => {
    if (impl) return impl(path, options);
    return path === '/api/agent_builder/conversations' ? { id: 'conv-1' } : {};
  }) as unknown as FetchMock;

interface IndexedDocument {
  index: string;
  id?: string;
  document: Record<string, unknown> & {
    process?: { command_line?: string };
    attributes?: { attack_discovery_alert_id?: string };
  };
}
const indexed = (es: ReturnType<typeof createEs>) =>
  (es.index.mock.calls as unknown[][]).map(([params]) => params as IndexedDocument);

const calls = (fetch: FetchMock) =>
  fetch.mock.calls.map(([path, options]) => `${options?.method ?? 'GET'} ${path}`);

describe('AlertZeroRuntime.read', () => {
  it('requests step outputs, which the execution API omits by default', async () => {
    const fetch = createFetch(() => ({ id: 'exec' }));
    await new AlertZeroRuntime(fetch).read('exec');
    expect(fetch).toHaveBeenCalledWith(
      '/api/workflows/executions/exec',
      expect.objectContaining({ query: { includeOutput: true } })
    );
  });
});

describe('AlertZeroRuntime.cancelAll', () => {
  const running = { id: 'exec-1', status: ExecutionStatus.RUNNING };

  it('cancels a still-running execution', async () => {
    const fetch = createFetch((path, options) => {
      if (path.endsWith('/cancel')) return {};
      return running;
    }) as FetchMock;
    const runtime = new AlertZeroRuntime(fetch);
    runtime.executionIds.add('exec-1');
    await runtime.cancelAll();
    expect(fetch).toHaveBeenCalledWith(
      '/api/workflows/executions/exec-1/cancel',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('does not throw when the execution reached a terminal state before the cancel landed', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const fetch = createFetch((path) => {
        if (path.endsWith('/cancel')) throw new Error('500 Something went wrong');
        return running;
      }) as FetchMock;
      const runtime = new AlertZeroRuntime(fetch);
      runtime.executionIds.add('exec-1');
      await expect(runtime.cancelAll()).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('could not cancel execution exec-1')
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('never issues a cancel for an already-terminal execution', async () => {
    const fetch = createFetch(() => ({ id: 'exec-1', status: ExecutionStatus.COMPLETED }));
    const runtime = new AlertZeroRuntime(fetch);
    runtime.executionIds.add('exec-1');
    await runtime.cancelAll();
    expect(fetch).not.toHaveBeenCalledWith(
      '/api/workflows/executions/exec-1/cancel',
      expect.anything()
    );
  });
});

describe('AlertZeroRuntime.installWorker', () => {
  const WORKER = 'system-security-forensics-endpoint-analysis';
  /**
   * Privileges production grants its own AI index (`ai-index-idx-security-investigations`).
   * The eval delta is derived from this grant at runtime, so the pin asserts parity with
   * production rather than a restated list.
   */
  const productionAiIndexPrivileges = structuredClone(
    WORKER_ROLE_DEFINITIONS[WORKER].role.elasticsearch.indices.find((entry: { names: string[] }) =>
      entry.names.includes('ai-index-idx-security-investigations')
    )!
  ).privileges as string[];

  it('enables the worker with a provisioned service account and disables it when it was off', async () => {
    const fetch = createFetch((path, options) => {
      if (path === '/internal/security/service_account' && !options?.method) {
        return { serviceAccounts: [], nextPage: undefined };
      }
      if (path === '/internal/security/service_account' && options?.method === 'POST') {
        return { id: 'sa-eval-1' };
      }
      if (path === '/internal/alertzero/workers' && !options?.method) {
        return { workers: [{ id: WORKER, enabled: false }], canModifyWorkers: true };
      }
      if (path === `/internal/alertzero/workers/${WORKER}`) {
        return { worker: { id: WORKER, enabled: true } };
      }
      return {};
    });
    const runtime = new AlertZeroRuntime(fetch);
    await runtime.installWorker(WORKER);

    // The enable PATCH must carry the service account id: since #295215 a bare
    // {"enabled":true} is rejected with 400 on a stack where no account is bound.
    const patchCalls = () =>
      fetch.mock.calls.filter(
        ([path, options]) =>
          String(path).startsWith('/internal/alertzero/workers/') && options?.method === 'PATCH'
      );
    // The workflow test API refuses a disabled workflow (400, build 1430): the Worker must
    // still be enabled when installWorker returns, i.e. the disable PATCH must NOT fire yet.
    expect(patchCalls()).toHaveLength(1);
    expect(JSON.parse(patchCalls()[0][1].body)).toEqual({
      enabled: true,
      settings: { serviceAccountId: 'sa-eval-1' },
      // A settings patch without settingsRevision is rejected by the workers service.
      settingsRevision: null,
    });
    // The Worker was disabled before the suite, so cleanup must leave it disabled.
    await runtime.restoreWorker();
    expect(patchCalls()).toHaveLength(2);
    expect(JSON.parse(patchCalls()[1][1].body)).toEqual({ enabled: false });
  });

  it('leaves an already-enabled worker enabled', async () => {
    const fetch = createFetch((path, options) => {
      if (path === '/internal/security/service_account' && !options?.method) {
        return {
          serviceAccounts: [{ id: 'sa-existing', name: 'alertzero_endpoint_analysis_eval' }],
        };
      }
      if (path === '/internal/alertzero/workers' && !options?.method) {
        return { workers: [{ id: WORKER, enabled: true }], canModifyWorkers: true };
      }
      return {};
    });
    const runtime = new AlertZeroRuntime(fetch);
    await runtime.installWorker(WORKER);
    // Already enabled before the suite: cleanup must not disable it.
    await runtime.restoreWorker();

    const patchBodies = fetch.mock.calls
      .filter(
        ([path, options]) =>
          String(path).startsWith('/internal/alertzero/workers/') && options?.method === 'PATCH'
      )
      .map(([, options]) => JSON.parse((options as { body: string }).body));
    expect(patchBodies).toHaveLength(1);
    expect(patchBodies[0]).toEqual({
      enabled: true,
      settings: { serviceAccountId: 'sa-existing' },
      settingsRevision: null,
    });
  });

  it('passes through the current settingsRevision on an already-installed worker', async () => {
    // A second run against an installed worker must send that worker's revision, or the
    // PATCH is rejected as a conflict by the workers service.
    const fetch = createFetch((path, options) => {
      if (path === '/internal/security/service_account' && !options?.method) {
        return {
          serviceAccounts: [{ id: 'sa-existing', name: 'alertzero_endpoint_analysis_eval' }],
        };
      }
      if (path === '/internal/alertzero/workers' && !options?.method) {
        return {
          workers: [{ id: WORKER, enabled: true, settingsRevision: 7 }],
          canModifyWorkers: true,
        };
      }
      return {};
    });
    await new AlertZeroRuntime(fetch).installWorker(WORKER);

    const patchBodies = fetch.mock.calls
      .filter(
        ([path, options]) =>
          String(path).startsWith('/internal/alertzero/workers/') && options?.method === 'PATCH'
      )
      .map(([, options]) => JSON.parse((options as { body: string }).body));
    expect(patchBodies).toHaveLength(1);
    expect(patchBodies[0]).toEqual({
      enabled: true,
      settings: { serviceAccountId: 'sa-existing' },
      settingsRevision: 7,
    });
  });

  it('re-PUTs the eval role even when the eval service account already exists', async () => {
    // A stale role definition from an earlier run must not win just because the account
    // was already created: the role PUT runs before (and regardless of) the account lookup.
    const fetch = createFetch((path, options) => {
      if (path === '/internal/security/service_account' && !options?.method) {
        return {
          serviceAccounts: [{ id: 'sa-existing', name: 'alertzero_endpoint_analysis_eval' }],
        };
      }
      return {};
    });
    await new AlertZeroRuntime(fetch).installWorker(WORKER);

    const rolePuts = fetch.mock.calls.filter(
      ([path, options]) =>
        String(path).startsWith('/api/security/role/') && options?.method === 'PUT'
    );
    expect(rolePuts).toHaveLength(1);
    const [rolePath, roleOptions] = rolePuts[0];
    expect(rolePath).toBe('/api/security/role/alertzero_endpoint_analysis_eval');
    expect((roleOptions as { query?: unknown }).query).toBeUndefined();
    const production = WORKER_ROLE_DEFINITIONS[WORKER].role;
    expect(JSON.parse((roleOptions as { body: string }).body)).toEqual({
      ...production,
      description: `${production.description} Eval variant.`,
      elasticsearch: {
        ...production.elasticsearch,
        indices: [
          ...production.elasticsearch.indices,
          {
            names: ['ai-index-idx-alertzero-eval-*'],
            privileges: productionAiIndexPrivileges,
          },
        ],
      },
    });
    // The existing account is still reused, not recreated.
    expect(
      fetch.mock.calls.some(
        ([path, options]) =>
          path === '/internal/security/service_account' && options?.method === 'POST'
      )
    ).toBe(false);
  });

  it('provisions the role with read access to the seeded AI index backing pattern', async () => {
    // The worker sweeps `ai-index-idx-alertzero-eval-*` as the service account; a role
    // without that pattern cannot find or dispatch the fixture (no hits, no privilege).
    const fetch = createFetch((path, options) => {
      if (path === '/internal/security/service_account' && !options?.method) {
        return { serviceAccounts: [], nextPage: undefined };
      }
      if (path === '/internal/security/service_account' && options?.method === 'POST') {
        return { id: 'sa-eval-1' };
      }
      return {};
    });
    await new AlertZeroRuntime(fetch).installWorker(WORKER);

    const rolePut = fetch.mock.calls.find(
      ([path, options]) =>
        String(path).startsWith('/api/security/role/') && options?.method === 'PUT'
    );
    expect(rolePut).toBeDefined();
    const [rolePath, roleOptions] = rolePut!;
    // Eval-specific role name: a createOnly PUT against the production role name would
    // silently lose the eval grant whenever that role already exists.
    expect(rolePath).toBe('/api/security/role/alertzero_endpoint_analysis_eval');
    expect((roleOptions as { query?: unknown }).query).toBeUndefined();
    const role = JSON.parse((rolePut![1] as { body: string }).body);
    const patterns = role.elasticsearch.indices.flatMap(
      (entry: { names: string[] }) => entry.names
    );
    expect(patterns).toContain('ai-index-idx-alertzero-eval-*');
  });

  it('grants exactly the production endpoint-analysis role plus the documented AI index delta', async () => {
    // B2 parity: everything the production `alertzero_endpoint_analysis` role grants must
    // be granted by the eval role, or the eval exercises a worker with different powers
    // than production. The only allowed difference is the eval's seeded-AI-index pattern.
    const fetch = createFetch((path, options) => {
      if (path === '/internal/security/service_account' && !options?.method) {
        return { serviceAccounts: [], nextPage: undefined };
      }
      if (path === '/internal/security/service_account' && options?.method === 'POST') {
        return { id: 'sa-eval-1' };
      }
      return {};
    });
    await new AlertZeroRuntime(fetch).installWorker(WORKER);

    const rolePut = fetch.mock.calls.find(
      ([path, options]) =>
        String(path).startsWith('/api/security/role/') && options?.method === 'PUT'
    );
    expect(rolePut).toBeDefined();
    const evalRole = JSON.parse((rolePut![1] as { body: string }).body);
    const production = structuredClone(WORKER_ROLE_DEFINITIONS[WORKER].role) as typeof evalRole;
    interface IndexEntry {
      names: string[];
      privileges: string[];
    }
    const isDelta = (entry: IndexEntry) => entry.names.includes('ai-index-idx-alertzero-eval-*');
    // Pin the delta itself: it must be exactly one entry on exactly that pattern carrying
    // exactly the privileges production grants its own AI index. Filtering it out of the
    // comparison without asserting it would let a widened grant (extra privileges or names,
    // or additional write entries) pass — and a read-only delta would 403 `set_ki_autonomy`.
    expect(evalRole.elasticsearch.indices.filter(isDelta)).toEqual([
      { names: ['ai-index-idx-alertzero-eval-*'], privileges: productionAiIndexPrivileges },
    ]);
    // Everything outside the delta must equal production, so extra entries (e.g. a
    // `.kibana*` write grant) are caught by the comparison below.
    expect(production.elasticsearch.indices.filter(isDelta)).toEqual([]);
    const normalize = (role: typeof evalRole) => ({
      ...role,
      description: undefined,
      elasticsearch: {
        ...role.elasticsearch,
        indices: role.elasticsearch.indices
          .filter((entry: IndexEntry) => !isDelta(entry))
          .map((entry: { names: string[]; privileges: string[] }) => ({
            names: [...entry.names].sort(),
            privileges: [...entry.privileges].sort(),
          }))
          .sort((a: { names: string[] }, b: { names: string[] }) =>
            a.names.join(',').localeCompare(b.names.join(','))
          ),
      },
      kibana: role.kibana,
    });
    expect(normalize(evalRole)).toEqual(normalize(production));
  });
});

describe('AlertZeroRuntime worker document id', () => {
  const WORKER = 'system-security-forensics-endpoint-analysis';
  const DOCUMENT_ID = `${WORKER}-default`;

  it('runs the per-space suffixed workflow id, not the bare registration id', async () => {
    // Workers install per space as `${workerId}-${spaceId}` (workers_service passes
    // workflowIdSuffix: spaceId); the bare id 404s on the workflow run API.
    const fetch = createFetch((path) => {
      if (path === '/internal/alertzero/workers') {
        return { workers: [{ id: WORKER, workflowId: DOCUMENT_ID }] };
      }
      return { workflowExecutionId: 'exec-1' };
    });
    const runtime = new AlertZeroRuntime(fetch);
    await runtime.run(WORKER, {});

    const runCall = fetch.mock.calls.find(([path]) => path === '/api/workflows/test');
    expect(runCall).toBeDefined();
    expect(JSON.parse((runCall![1] as { body: string }).body)).toMatchObject({
      workflowId: DOCUMENT_ID,
    });
  });

  it('asserts the suffixed workflow document is installed and valid', async () => {
    const fetch = createFetch((path) => {
      if (path === '/internal/alertzero/workers') {
        return { workers: [{ id: WORKER, workflowId: DOCUMENT_ID }] };
      }
      if (path.startsWith('/api/workflows/workflow/')) {
        return { id: decodeURIComponent(path.split('/').pop()!), valid: true };
      }
      return {};
    });
    const runtime = new AlertZeroRuntime(fetch);
    await expect(runtime.assertInstalled()).resolves.toBeUndefined();

    const reads = fetch.mock.calls
      .map(([path]) => String(path))
      .filter((path) => path.startsWith('/api/workflows/workflow/'));
    expect(reads).toContain(`/api/workflows/workflow/${DOCUMENT_ID}`);
    expect(reads).not.toContain(`/api/workflows/workflow/${WORKER}`);
  });

  it('fails assertInstalled when the worker has no installed document', async () => {
    const fetch = createFetch((path) => {
      if (path === '/internal/alertzero/workers') {
        return { workers: [{ id: WORKER, workflowId: null }] };
      }
      if (path.startsWith('/api/workflows/workflow/')) {
        return { id: decodeURIComponent(path.split('/').pop()!), valid: true };
      }
      return {};
    });
    const runtime = new AlertZeroRuntime(fetch);
    await expect(runtime.assertInstalled()).rejects.toThrow(/no installed workflow document/);
  });
});

describe('seedAlertZeroEndpoint', () => {
  it('seeds the logs-* fixture as a data stream, not a plain index', async () => {
    const es = createEs();
    const fixture = await seedAlertZeroEndpoint(es, createFetch());

    expect(es.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        index_patterns: [fixture.index],
        data_stream: {},
      })
    );
    expect(es.indices.createDataStream).toHaveBeenCalledWith({ name: fixture.index });
    expect(es.indices.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ index: fixture.index })
    );
    // Data-stream appends must be creates so re-seeding a UUID-scoped name never
    // overwrites silently.
    for (const params of es.index.mock.calls as unknown[][]) {
      const { index, op_type: opType } = params[0] as { index: string; op_type?: string };
      if (index === fixture.index) expect(opType).toBe('create');
    }
  });

  it('creates and cleans up the AI index through the registered context_engine route', async () => {
    const fetch = createFetch();
    const es = createEs();
    const fixture = await seedAlertZeroEndpoint(es, fetch);
    await fixture.cleanup();

    const paths = calls(fetch);
    expect(paths).toContain('POST /api/context_engine/ai_index');
    expect(paths).toContain(`DELETE /api/context_engine/ai_index/${fixture.aiIndexId}`);
    expect(paths.filter((path) => path.includes('context-engine'))).toEqual([]);
  });

  it('seeds the Attack Discovery alert in the production shape the workflow reads', async () => {
    const es = createEs();
    const fixture = await seedAlertZeroEndpoint(es, createFetch());

    const documents = indexed(es);
    const alert = documents.find(
      ({ index }) => index === '.adhoc.alerts-security.attack.discovery.alerts-default'
    );
    const ki = documents.find(({ id }) => id === fixture.kiId);
    const constituentIds = alert?.document['kibana.alert.attack_discovery.alert_ids'] as string[];
    const constituent = documents.find(({ id }) => id === constituentIds?.[0]);

    // The workflow (forensics_run_endpoint_analysis.yaml) reads the AD alert's
    // `kibana.alert.attack_discovery.alert_ids`, then resolves the host from its
    // constituent detections in `.alerts-security.alerts-<space>` via a `host.name`
    // terms aggregation. The AD alert itself carries no host in production
    // (transformToBaseAlertDocument), so a flat `host.name` on it is never read.
    expect(alert?.id).toBe(ki?.document.attributes?.attack_discovery_alert_id);
    expect(alert?.document['kibana.alert.uuid']).toBe(alert?.id);
    expect(alert?.document['host.name']).toBeUndefined();
    expect(alert?.document['host']).toBeUndefined();
    expect(constituentIds).toHaveLength(1);
    expect(constituent?.index).toBe('.alerts-security.alerts-default');
    expect(constituent?.document.host).toEqual({ name: fixture.host });
  });

  it('cleans up the seeded constituent detection with the Attack Discovery alert', async () => {
    const es = createEs();
    const fixture = await seedAlertZeroEndpoint(es, createFetch());
    await fixture.cleanup();

    const deleted = (es.delete.mock.calls as unknown[][]).map(
      ([params]) => params as { index: string; id: string }
    );
    const constituent = deleted.find(({ index }) => index === '.alerts-security.alerts-default');
    const documents = indexed(es);
    const adAlert = documents.find(
      ({ index }) => index === '.adhoc.alerts-security.attack.discovery.alerts-default'
    );
    const constituentIds = adAlert?.document['kibana.alert.attack_discovery.alert_ids'] as string[];
    expect(deleted).toContainEqual(
      expect.objectContaining({
        index: '.adhoc.alerts-security.attack.discovery.alerts-default',
        id: adAlert?.id,
      })
    );
    expect(constituent?.id).toBe(constituentIds?.[0]);
  });

  it('exposes the full seeded command line as the expected IoC evidence', async () => {
    const es = createEs();
    const fixture = await seedAlertZeroEndpoint(es, createFetch());
    const seededCommandLines = indexed(es).map(({ document }) => document.process?.command_line);
    expect(seededCommandLines).toContain(fixture.command);
    expect(fixture.command).not.toBe('EncodedCommand');
  });

  it('creates the investigation conversation as public so the workflow service account can read it', async () => {
    const fetch = createFetch();
    await seedAlertZeroEndpoint(createEs(), fetch);

    const create = fetch.mock.calls.find(
      ([path, options]) => path === '/api/agent_builder/conversations' && options?.method === 'POST'
    );
    expect(JSON.parse((create?.[1] as { body: string }).body)).toEqual(
      expect.objectContaining({
        template_id: 'investigation',
        access_control: { access_mode: 'public' },
      })
    );
  });

  it('removes already-created resources when seeding fails part way', async () => {
    const fetch = createFetch((path, options) => {
      if (path === '/api/context_engine/ai_index' && options?.method === 'POST') {
        throw new Error('boom');
      }
      return path === '/api/agent_builder/conversations' ? { id: 'conv-1' } : {};
    });
    const es = createEs();

    await expect(seedAlertZeroEndpoint(es, fetch)).rejects.toThrow('boom');
    expect(calls(fetch)).toContain('DELETE /api/agent_builder/conversations/conv-1');
    expect(es.indices.delete).toHaveBeenCalled();
    expect(es.delete).toHaveBeenCalled();
  });
});

describe('pinAgenticConnector', () => {
  const route = '/internal/search_inference_endpoints/settings';
  const previous = [
    { feature_id: 'agent_builder', endpoints: [{ id: 'keep-me' }] },
    { feature_id: ALERTZERO_AGENTIC_INFERENCE_FEATURE_ID, endpoints: [{ id: 'old' }] },
  ];

  it('routes the agentic feature to the eval connector and restores the previous settings', async () => {
    const fetch = createFetch((path) => (path === route ? { data: { features: previous } } : {}));
    const restore = await pinAgenticConnector(fetch, 'eval-connector');

    const bodies = fetch.mock.calls
      .filter(([, options]) => options?.method === 'PUT')
      .map(([, options]) => JSON.parse((options as { body: string }).body).features);
    expect(bodies[0]).toEqual([
      previous[0],
      { feature_id: ALERTZERO_AGENTIC_INFERENCE_FEATURE_ID, endpoints: [{ id: 'eval-connector' }] },
    ]);

    await restore();
    const restored = fetch.mock.calls
      .filter(([, options]) => options?.method === 'PUT')
      .map(([, options]) => JSON.parse((options as { body: string }).body).features);
    expect(restored[1]).toEqual(previous);
  });
});

describe('installWorkerAndPinConnector', () => {
  const WORKER = 'system-security-forensics-endpoint-analysis';
  const settingsRoute = '/internal/search_inference_endpoints/settings';

  const setup = ({
    workflowValid = true,
    pinFails = false,
  }: { workflowValid?: boolean; pinFails?: boolean } = {}) => {
    const fetch = createFetch((path, options) => {
      if (path === '/internal/security/service_account' && !options?.method) {
        return { serviceAccounts: [], nextPage: undefined };
      }
      if (path === '/internal/security/service_account' && options?.method === 'POST') {
        return { id: 'sa-eval-1' };
      }
      if (path === '/internal/alertzero/workers' && !options?.method) {
        return { workers: [{ id: WORKER, enabled: false, workflowId: `${WORKER}-default` }] };
      }
      if (path.startsWith('/api/workflows/workflow/')) {
        return { id: decodeURIComponent(path.split('/').pop() ?? ''), valid: workflowValid };
      }
      if (path === settingsRoute && options?.method === 'PUT' && pinFails) {
        throw new Error('pin rejected');
      }
      if (path === settingsRoute) return { data: { features: [] } };
      return {};
    });
    const workerPatches = () =>
      fetch.mock.calls
        .filter(
          ([path, options]) =>
            String(path).startsWith('/internal/alertzero/workers/') && options?.method === 'PATCH'
        )
        .map(([, options]) => JSON.parse((options as { body: string }).body));
    return { fetch, workerPatches, runtime: new AlertZeroRuntime(fetch) };
  };

  it('disables a previously-off worker when the workflow assertion fails', async () => {
    const { fetch, runtime, workerPatches } = setup({ workflowValid: false });
    await expect(
      installWorkerAndPinConnector(runtime, fetch, WORKER, 'eval-connector')
    ).rejects.toThrow('Required production workflow unavailable');
    expect(workerPatches().map((body) => body.enabled)).toEqual([true, false]);
  });

  it('disables a previously-off worker when pinning the connector fails', async () => {
    const { fetch, runtime, workerPatches } = setup({ pinFails: true });
    await expect(
      installWorkerAndPinConnector(runtime, fetch, WORKER, 'eval-connector')
    ).rejects.toThrow('pin rejected');
    expect(workerPatches().map((body) => body.enabled)).toEqual([true, false]);
  });

  it('keeps the worker enabled and returns the restore function on success', async () => {
    const { fetch, runtime, workerPatches } = setup();
    const restore = await installWorkerAndPinConnector(runtime, fetch, WORKER, 'eval-connector');
    expect(workerPatches().map((body) => body.enabled)).toEqual([true]);
    await restore();
  });
});

describe('runAllCleanups', () => {
  it('runs every step in order, including the restore, when an earlier step throws', async () => {
    const order: string[] = [];
    const steps = [
      async () => {
        order.push('cancel');
        throw new Error('cancel failed');
      },
      async () => {
        order.push('cleanup');
        throw new Error('cleanup failed');
      },
      async () => {
        order.push('restore');
      },
    ];
    await expect(runAllCleanups(steps)).rejects.toThrow('cancel failed');
    expect(order).toEqual(['cancel', 'cleanup', 'restore']);
  });

  it('resolves when every step succeeds', async () => {
    await expect(runAllCleanups([async () => 1, async () => 2])).resolves.toBeUndefined();
  });
});
