/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { ALERTZERO_AGENTIC_INFERENCE_FEATURE_ID } from '@kbn/alertzero-common';
import {
  AlertZeroRuntime,
  pinAgenticConnector,
  runAllCleanups,
  seedAlertZeroEndpoint,
} from './runtime';

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

describe('AlertZeroRuntime.installWorker', () => {
  const WORKER = 'system-security-forensics-endpoint-analysis';

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
    await new AlertZeroRuntime(fetch).installWorker(WORKER);

    // The enable PATCH must carry the service account id: since #295215 a bare
    // {"enabled":true} is rejected with 400 on a stack where no account is bound.
    const patchCalls = fetch.mock.calls.filter(
      ([path, options]) =>
        String(path).startsWith('/internal/alertzero/workers/') && options?.method === 'PATCH'
    );
    expect(patchCalls).toHaveLength(2);
    expect(JSON.parse(patchCalls[0][1].body)).toEqual({
      enabled: true,
      settings: { serviceAccountId: 'sa-eval-1' },
      // A settings patch without settingsRevision is rejected by the workers service.
      settingsRevision: null,
    });
    // The Worker was disabled before the suite, so the suite must leave it disabled.
    expect(JSON.parse(patchCalls[1][1].body)).toEqual({ enabled: false });
  });

  it('leaves an already-enabled worker enabled', async () => {
    const fetch = createFetch((path, options) => {
      if (path === '/internal/security/service_account' && !options?.method) {
        return { serviceAccounts: [{ id: 'sa-existing', name: 'alertzero_endpoint_analysis' }] };
      }
      if (path === '/internal/alertzero/workers' && !options?.method) {
        return { workers: [{ id: WORKER, enabled: true }], canModifyWorkers: true };
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
      settingsRevision: null,
    });
  });

  it('passes through the current settingsRevision on an already-installed worker', async () => {
    // A second run against an installed worker must send that worker's revision, or the
    // PATCH is rejected as a conflict by the workers service.
    const fetch = createFetch((path, options) => {
      if (path === '/internal/security/service_account' && !options?.method) {
        return { serviceAccounts: [{ id: 'sa-existing', name: 'alertzero_endpoint_analysis' }] };
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
    const role = JSON.parse((rolePut![1] as { body: string }).body);
    const patterns = role.elasticsearch.indices.flatMap(
      (entry: { names: string[] }) => entry.names
    );
    expect(patterns).toContain('ai-index-idx-alertzero-eval-*');
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

  it('seeds the Attack Discovery alert the KI points at, with the seeded host', async () => {
    const es = createEs();
    const fixture = await seedAlertZeroEndpoint(es, createFetch());

    const documents = indexed(es);
    const alert = documents.find(({ index }) => index.includes('attack.discovery.alerts'));
    const ki = documents.find(({ id }) => id === fixture.kiId);
    expect(alert?.document['host.name']).toBe(fixture.host);
    expect(alert?.id).toBe(ki?.document.attributes?.attack_discovery_alert_id);
    expect(alert?.document['kibana.alert.uuid']).toBe(alert?.id);
  });

  it('exposes the full seeded command line as the expected IoC evidence', async () => {
    const es = createEs();
    const fixture = await seedAlertZeroEndpoint(es, createFetch());
    const seededCommandLines = indexed(es).map(({ document }) => document.process?.command_line);
    expect(seededCommandLines).toContain(fixture.command);
    expect(fixture.command).not.toBe('EncodedCommand');
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
