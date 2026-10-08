/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { ALERTZERO_AGENTIC_INFERENCE_FEATURE_ID } from '@kbn/alertzero-common';
import { AlertZeroRuntime, pinAgenticConnector, seedAlertZeroEndpoint } from './runtime';

const createEs = () => {
  const es = {
    indices: { create: jest.fn(async () => ({})), delete: jest.fn(async () => ({})) },
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

describe('seedAlertZeroEndpoint', () => {
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
