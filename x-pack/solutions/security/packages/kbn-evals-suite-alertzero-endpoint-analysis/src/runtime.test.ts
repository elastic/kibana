/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { ALERTZERO_BALANCED_INFERENCE_FEATURE_ID } from '@kbn/alertzero-common';
import {
  AlertZeroRuntime,
  assertNoCompetingPendingKis,
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
    search: jest.fn(async () => ({ hits: { hits: [] } })),
  };
  return es as typeof es & Client;
};

// What the fake stack answers for the Worker's built-in role lookup.
const stack: { serverless: boolean; role: 'reserved' | 'not_reserved' | 'missing' | 'error' } = {
  serverless: false,
  role: 'reserved',
};
beforeEach(() => {
  stack.serverless = false;
  stack.role = 'reserved';
});
const BUILT_IN_ROLE_PREFIX = '/api/security/role/';
const stackAnswer = (path: string): { handled: boolean; value?: unknown } => {
  if (path === '/api/status') {
    return {
      handled: true,
      value: { version: { build_flavor: stack.serverless ? 'serverless' : 'traditional' } },
    };
  }
  if (path.startsWith(BUILT_IN_ROLE_PREFIX)) {
    if (stack.role === 'missing')
      throw Object.assign(new Error('Not Found'), { response: { status: 404 } });
    if (stack.role === 'error')
      throw Object.assign(new Error('boom'), { response: { status: 500 } });
    return {
      handled: true,
      value: { metadata: stack.role === 'reserved' ? { _reserved: true } : {} },
    };
  }
  return { handled: false };
};

type FetchMock = jest.Mock & HttpHandler;
const createFetch = (impl?: (path: string, options?: { method?: string }) => unknown) =>
  jest.fn(async (path: string, options?: { method?: string }) => {
    const answer = stackAnswer(path);
    if (answer.handled) return answer.value;
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
      // Pre-read RUNNING, post-error re-read COMPLETED: the cancel failed only
      // because the execution finished in between, so the error is tolerated.
      const fetch = createFetch((path) => {
        if (path.endsWith('/cancel')) throw new Error('500 Something went wrong');
        return fetch.mock.calls.filter(([p]) => !p.endsWith('/cancel')).length <= 1
          ? running
          : { id: 'exec-1', status: ExecutionStatus.COMPLETED };
      }) as FetchMock;
      const runtime = new AlertZeroRuntime(fetch);
      runtime.executionIds.add('exec-1');
      await expect(runtime.cancelAll()).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('reached terminal state completed')
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('rejects when the cancel fails and the execution is still non-terminal', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const fetch = createFetch((path) => {
        if (path.endsWith('/cancel')) throw new Error('403 Forbidden');
        return running;
      }) as FetchMock;
      const runtime = new AlertZeroRuntime(fetch);
      runtime.executionIds.add('exec-1');
      await expect(runtime.cancelAll()).rejects.toThrow('403 Forbidden');
      expect(warn).not.toHaveBeenCalled();
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
  const roleCalls = (fetch: FetchMock) =>
    fetch.mock.calls.filter(([path]) => String(path).startsWith('/api/security/role/'));
  const accountPosts = (fetch: FetchMock) =>
    fetch.mock.calls
      .filter(
        ([path, options]) =>
          path === '/internal/security/service_account' && options?.method === 'POST'
      )
      .map(([, options]) => JSON.parse((options as { body: string }).body));
  const noAccountsFetch = () =>
    createFetch((path, options) => {
      if (path === '/internal/security/service_account' && !options?.method) {
        return { serviceAccounts: [], nextPage: undefined };
      }
      if (path === '/internal/security/service_account' && options?.method === 'POST') {
        return { id: 'sa-eval-1' };
      }
      return {};
    });

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
          serviceAccounts: [{ id: 'sa-existing', name: 'alertzero_endpoint_analysis' }],
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
          serviceAccounts: [{ id: 'sa-existing', name: 'alertzero_endpoint_analysis' }],
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

  it('never writes a role: no PUT/POST/DELETE to /api/security/role, only GETs of the built-in one', async () => {
    const fetch = noAccountsFetch();
    await new AlertZeroRuntime(fetch).installWorker(WORKER);

    const roleLookups = roleCalls(fetch);
    expect(roleLookups).toHaveLength(1);
    expect(roleLookups[0][0]).toBe('/api/security/role/alertzero_endpoint_analysis');
    expect(roleLookups[0][1]?.method).toBe('GET');
  });

  it('creates the service account with the built-in role, not an eval-specific one', async () => {
    const fetch = noAccountsFetch();
    await new AlertZeroRuntime(fetch).installWorker(WORKER);

    expect(accountPosts(fetch)).toEqual([
      expect.objectContaining({
        name: 'alertzero_endpoint_analysis',
        roles: ['alertzero_endpoint_analysis'],
      }),
    ]);
  });

  it('uses the _-prefixed predefined role on Serverless', async () => {
    stack.serverless = true;
    const fetch = noAccountsFetch();
    await new AlertZeroRuntime(fetch).installWorker(WORKER);

    expect(roleCalls(fetch)[0][0]).toBe('/api/security/role/_alertzero_endpoint_analysis');
    expect(accountPosts(fetch)[0]).toEqual(
      expect.objectContaining({
        name: 'alertzero_endpoint_analysis',
        roles: ['_alertzero_endpoint_analysis'],
      })
    );
  });

  it('fails naming the role, and creates nothing, when the built-in role is missing', async () => {
    stack.role = 'missing';
    const fetch = noAccountsFetch();
    await expect(new AlertZeroRuntime(fetch).installWorker(WORKER)).rejects.toThrow(
      /reserved role "alertzero_endpoint_analysis" is missing/
    );
    expect(roleCalls(fetch).map(([, options]) => options?.method)).toEqual(['GET']);
    expect(accountPosts(fetch)).toEqual([]);
  });

  it('fails naming the Serverless role when the predefined role is missing', async () => {
    stack.serverless = true;
    stack.role = 'missing';
    await expect(new AlertZeroRuntime(noAccountsFetch()).installWorker(WORKER)).rejects.toThrow(
      /predefined role "_alertzero_endpoint_analysis" is missing/
    );
  });

  it('rejects a role of that name that is not reserved', async () => {
    stack.role = 'not_reserved';
    const fetch = noAccountsFetch();
    await expect(new AlertZeroRuntime(fetch).installWorker(WORKER)).rejects.toThrow(
      /reserved role "alertzero_endpoint_analysis" is missing/
    );
    expect(accountPosts(fetch)).toEqual([]);
  });

  it('rethrows a non-404 role lookup error unchanged', async () => {
    stack.role = 'error';
    await expect(new AlertZeroRuntime(noAccountsFetch()).installWorker(WORKER)).rejects.toThrow(
      'boom'
    );
  });

  it('still checks the built-in role when the account already exists', async () => {
    stack.role = 'missing';
    const fetch = createFetch((path, options) =>
      path === '/internal/security/service_account' && !options?.method
        ? { serviceAccounts: [{ id: 'sa-existing', name: 'alertzero_endpoint_analysis' }] }
        : {}
    );
    await expect(new AlertZeroRuntime(fetch).installWorker(WORKER)).rejects.toThrow(
      /alertzero_endpoint_analysis" is missing/
    );
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

  it('seeds into the shared security-investigations AI index, registering it only when missing', async () => {
    const missing = createFetch((path, options) => {
      if (
        path === '/api/context_engine/ai_index/security-investigations' &&
        options?.method === 'GET'
      ) {
        throw Object.assign(new Error('Not Found'), { response: { status: 404 } });
      }
      return path === '/api/agent_builder/conversations' ? { id: 'conv-1' } : {};
    });
    const es = createEs();
    const fixture = await seedAlertZeroEndpoint(es, missing);
    expect(fixture.aiIndexId).toBe('security-investigations');
    expect(calls(missing)).toContain('POST /api/context_engine/ai_index');
    expect(indexed(es).find(({ id }) => id === fixture.kiId)?.index).toBe(
      'ai-index-idx-security-investigations'
    );

    const present = createFetch();
    await seedAlertZeroEndpoint(createEs(), present);
    expect(calls(present)).not.toContain('POST /api/context_engine/ai_index');
  });

  it('cleanup deletes only the seeded KI, never the shared index or its registration', async () => {
    const fetch = createFetch();
    const es = createEs();
    const fixture = await seedAlertZeroEndpoint(es, fetch);
    await fixture.cleanup();

    expect(es.delete).toHaveBeenCalledWith(
      { index: 'ai-index-idx-security-investigations', id: fixture.kiId, refresh: 'wait_for' },
      { ignore: [404] }
    );
    expect(es.indices.delete).not.toHaveBeenCalled();
    expect(calls(fetch).filter((path) => path.startsWith('DELETE /api/context_engine'))).toEqual(
      []
    );
    const kiDeletes = (es.delete.mock.calls as unknown[][]).filter(
      ([params]) => (params as { index: string }).index === 'ai-index-idx-security-investigations'
    );
    expect(kiDeletes).toHaveLength(1);
  });

  it('refuses to seed, naming the ids, when another pending analyze_endpoint KI would be swept first', async () => {
    const es = createEs();
    es.search.mockResolvedValueOnce({
      hits: { hits: [{ _id: 'decoy-1', _source: { id: 'decoy-1' } }] },
    } as never);
    const fetch = createFetch();

    await expect(seedAlertZeroEndpoint(es, fetch)).rejects.toThrow(/decoy-1/);
    // Nothing of ours reaches the shared index, and the decoy is never touched.
    expect(indexed(es).some(({ index }) => index === 'ai-index-idx-security-investigations')).toBe(
      false
    );
    const deletedIds = (es.delete.mock.calls as unknown[][]).map(
      ([params]) => (params as { id: string }).id
    );
    expect(deletedIds).not.toContain('decoy-1');
  });

  it('seeds once the decoy is gone', async () => {
    const es = createEs();
    es.search.mockResolvedValueOnce({
      hits: { hits: [{ _id: 'decoy-1', _source: { id: 'decoy-1' } }] },
    } as never);
    await expect(seedAlertZeroEndpoint(es, createFetch())).rejects.toThrow(/decoy-1/);

    es.search.mockResolvedValue({ hits: { hits: [] } } as never);
    const fixture = await seedAlertZeroEndpoint(es, createFetch());
    expect(indexed(es).some(({ id }) => id === fixture.kiId)).toBe(true);
  });

  it('the precondition mirrors the sweep filter and excludes only our own KI', async () => {
    const es = createEs();
    await assertNoCompetingPendingKis(es, 'own-ki');
    const params = (es.search.mock.calls as unknown[][])[0][0] as {
      index: string;
      query: { bool: { filter: unknown[]; must_not: unknown[] } };
    };
    expect(params.index).toBe('ai-index-idx-security-investigations');
    expect(params.query.bool.filter).toEqual([
      { term: { type: 'security.analyze_endpoint' } },
      { term: { 'attributes.status': 'pending' } },
      { term: { 'attributes.space_id': 'default' } },
      { range: { '@timestamp': { gte: 'now-7d' } } },
    ]);
    expect(params.query.bool.must_not).toEqual([
      { term: { id: 'own-ki' } },
      { ids: { values: ['own-ki'] } },
    ]);
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
    const fetch = createFetch((path) => {
      if (path === '/api/context_engine/ai_index/security-investigations') {
        throw new Error('boom');
      }
      return path === '/api/agent_builder/conversations' ? { id: 'conv-1' } : {};
    });
    const es = createEs();

    await expect(seedAlertZeroEndpoint(es, fetch)).rejects.toThrow('boom');
    expect(calls(fetch)).toContain('DELETE /api/agent_builder/conversations/conv-1');
    expect(es.indices.deleteDataStream).toHaveBeenCalled();
    expect(es.delete).toHaveBeenCalled();
  });
});

describe('pinAgenticConnector', () => {
  const route = '/internal/search_inference_endpoints/settings';
  const previous = [
    { feature_id: 'agent_builder', endpoints: [{ id: 'keep-me' }] },
    { feature_id: ALERTZERO_BALANCED_INFERENCE_FEATURE_ID, endpoints: [{ id: 'old' }] },
  ];

  it('routes the agentic feature to the eval connector and restores the previous settings', async () => {
    const fetch = createFetch((path) => (path === route ? { data: { features: previous } } : {}));
    const restore = await pinAgenticConnector(fetch, 'eval-connector');

    const bodies = fetch.mock.calls
      .filter(([, options]) => options?.method === 'PUT')
      .map(([, options]) => JSON.parse((options as { body: string }).body).features);
    expect(bodies[0]).toEqual([
      previous[0],
      {
        feature_id: ALERTZERO_BALANCED_INFERENCE_FEATURE_ID,
        endpoints: [{ id: 'eval-connector' }],
      },
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
