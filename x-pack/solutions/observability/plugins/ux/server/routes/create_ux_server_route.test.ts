/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import {
  configureUxInspect,
  inspectableEsQueriesMap,
} from '../lib/inspect/inspectable_es_queries_map';
import { createUxServerRoute } from './create_ux_server_route';

interface InspectTestResources {
  request: KibanaRequest;
  context: { core: Promise<unknown> };
}

const invokeRoute = (
  route: ReturnType<typeof createUxServerRoute>,
  resources: InspectTestResources
): Promise<unknown> => {
  const def = Object.values(route)[0] as unknown as {
    handler: (resources: InspectTestResources) => Promise<unknown>;
  };
  return def.handler(resources);
};

describe('createUxServerRoute inspect', () => {
  const request = {
    query: {},
    route: { method: 'get', path: '/internal/ux/rum/overview' },
  } as unknown as KibanaRequest;

  beforeEach(() => {
    configureUxInspect({ isDev: true });
  });

  afterEach(() => {
    configureUxInspect({ isDev: false });
    inspectableEsQueriesMap.delete(request);
  });

  it('attaches recorded ES queries on the route response', async () => {
    const route = createUxServerRoute({
      endpoint: 'GET /internal/ux/rum/inspect_test',
      options: { access: 'internal' },
      security: { authz: { requiredPrivileges: ['apm'] } },
      handler: async ({ request: req }) => {
        inspectableEsQueriesMap.get(req)?.push({ name: 'search' } as never);
        return { ok: true };
      },
    });

    const result = await invokeRoute(route, {
      request,
      context: { core: Promise.resolve({}) },
    });

    expect(result).toEqual({ ok: true, _inspect: [{ name: 'search' }] });
    expect(inspectableEsQueriesMap.has(request)).toBe(false);
  });

  it('does not wipe a parent request map used by nested callRoute', async () => {
    inspectableEsQueriesMap.set(request, [{ name: 'parent' } as never]);
    const route = createUxServerRoute({
      endpoint: 'GET /internal/ux/rum/inspect_nested',
      options: { access: 'internal' },
      security: { authz: { requiredPrivileges: ['apm'] } },
      handler: async ({ request: req }) => {
        inspectableEsQueriesMap.get(req)?.push({ name: 'child' } as never);
        return { sessions: [] };
      },
    });

    const result = await invokeRoute(route, {
      request,
      context: { core: Promise.resolve({}) },
    });

    expect(result).toEqual({ sessions: [] });
    expect(inspectableEsQueriesMap.get(request)).toEqual([{ name: 'parent' }, { name: 'child' }]);
  });
});
