/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { RouteDependencies } from '../register_routes';
import { HUNT_DEFINITIONS } from '../../hunt_library/seed';
import { registerHuntLibraryRoutes } from './hunt_library_routes';

const makeDeps = ({
  universe = ['logs-*'],
  isServerless = false,
  userName = 'analyst',
}: { universe?: string[]; isServerless?: boolean; userName?: string } = {}) => {
  const get = jest.fn();
  const addVersion = jest.fn();
  get.mockReturnValue({ addVersion });
  const router = { versioned: { get } };

  registerHuntLibraryRoutes({
    router: router as unknown as RouteDependencies['router'],
    logger: loggingSystemMock.createLogger(),
    getSpaceId: () => 'default',
    isServerless,
  } as unknown as RouteDependencies);

  const asCurrentUser = {
    indices: {
      // Every requested pattern resolves to one concrete data stream.
      resolveIndex: jest.fn().mockImplementation(async ({ name }: { name: string[] }) => ({
        indices: [],
        aliases: [],
        data_streams: name.map((pattern) => ({
          name: pattern.replace(/\*/g, 'x'),
          backing_indices: [],
        })),
      })),
    },
    fieldCaps: jest.fn().mockImplementation(({ fields }: { fields: string[] }) => ({
      fields: Object.fromEntries(
        fields.map((field) => [field, { keyword: { type: 'keyword', searchable: true } }])
      ),
    })),
    esql: { query: jest.fn().mockResolvedValue({}) },
    security: {
      getRole: jest.fn().mockResolvedValue({
        alertzero_threat_hunt: { indices: [{ names: ['logs-*'], privileges: ['read'] }] },
      }),
      queryRole: jest.fn(),
    },
  };
  const context = {
    alertzero: Promise.resolve({
      subscription: 'available',
      hasRequiredDependencies: true,
      isSpaceSupported: true,
    }),
    core: Promise.resolve({
      elasticsearch: { client: { asCurrentUser } },
      uiSettings: { client: { get: jest.fn().mockResolvedValue(true) } },
      security: { authc: { getCurrentUser: () => ({ username: userName }) } },
    }),
  };
  // The enablement setting and the hunt universe read the same mock: one setting at a time.
  (context.core as unknown as Promise<{ uiSettings: { client: { get: jest.Mock } } }>).then(
    ({ uiSettings }) =>
      uiSettings.client.get.mockImplementation(async (key: string) =>
        key.includes('defaultIndex') ? universe : true
      )
  );

  return {
    listRoute: get.mock.calls[0][0],
    detailRoute: get.mock.calls[1][0],
    list: addVersion.mock.calls[0][1],
    detail: addVersion.mock.calls[1][1],
    detailValidate: addVersion.mock.calls[1][0].validate,
    context,
    asCurrentUser,
  };
};

describe('registerHuntLibraryRoutes', () => {
  it('requires only AlertZero Read and is internal, for both routes', () => {
    const { listRoute, detailRoute } = makeDeps();

    for (const route of [listRoute, detailRoute]) {
      expect(route.access).toBe('internal');
      expect(route.security.authz.requiredPrivileges).toEqual(['alertzero_read']);
    }
  });

  it('lists every curated hunt with the caller availability only', async () => {
    const { list, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await list(context, httpServerMock.createKibanaRequest(), response);

    const { hunts } = response.ok.mock.calls[0][0]!.body as {
      hunts: Array<{ id: string; availability: { identity: string; available: boolean } }>;
    };
    expect(hunts.map(({ id }) => id)).toEqual(HUNT_DEFINITIONS.map(({ id }) => id));
    expect(hunts.every(({ availability }) => availability.identity === 'caller')).toBe(true);
    expect(hunts[0]).not.toHaveProperty('query');
  });

  it('marks a hunt unavailable for scope when the universe does not cover its patterns', async () => {
    const { list, context, asCurrentUser } = makeDeps({ universe: ['filebeat-*'] });
    const response = httpServerMock.createResponseFactory();

    await list(context, httpServerMock.createKibanaRequest(), response);

    const { hunts } = response.ok.mock.calls[0][0]!.body as {
      hunts: Array<{ availability: { firstFailure: string } }>;
    };
    expect(
      hunts.every(({ availability }) => availability.firstFailure === 'unavailable_scope')
    ).toBe(true);
    expect(asCurrentUser.esql.query).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown hunt id and never touches Elasticsearch', async () => {
    const { detail, context, asCurrentUser } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await detail(context, httpServerMock.createKibanaRequest({ params: { id: 'nope' } }), response);

    expect(response.notFound).toHaveBeenCalled();
    expect(asCurrentUser.indices.resolveIndex).not.toHaveBeenCalled();
  });

  it('bounds the id path parameter', () => {
    const { detailValidate } = makeDeps();
    const params = detailValidate.request.params;

    expect(() => params.validate('a'.repeat(129))).toThrow();
    expect(() => params.validate({ id: 'a'.repeat(129) })).toThrow();
    expect(params.validate({ id: 'rare_lsass_process_access' })).toEqual({
      id: 'rare_lsass_process_access',
    });
  });

  it('returns detail with caller and worker availability, probing only the caller', async () => {
    const { detail, context, asCurrentUser } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await detail(
      context,
      httpServerMock.createKibanaRequest({ params: { id: 'rare_lsass_process_access' } }),
      response
    );

    const body = response.ok.mock.calls[0][0]!.body as {
      callerAvailability: { available: boolean; probe: string };
      workerAvailability: { available: boolean; probe: string };
      guidance: unknown;
      query: { query: string };
    };
    expect(body.callerAvailability).toMatchObject({ available: true, probe: 'passed' });
    expect(body.workerAvailability).toMatchObject({ available: true, probe: 'skipped' });
    expect(body.guidance).toBeDefined();
    expect(asCurrentUser.esql.query).toHaveBeenCalledTimes(1);
  });

  it('reports the worker unavailable for scope when its role does not cover the patterns', async () => {
    const { detail, context, asCurrentUser } = makeDeps();
    asCurrentUser.security.getRole.mockResolvedValue({
      alertzero_threat_hunt: { indices: [{ names: ['filebeat-*'], privileges: ['read'] }] },
    });
    const response = httpServerMock.createResponseFactory();

    await detail(
      context,
      httpServerMock.createKibanaRequest({ params: { id: 'rare_lsass_process_access' } }),
      response
    );

    const body = response.ok.mock.calls[0][0]!.body as {
      callerAvailability: { available: boolean };
      workerAvailability: { firstFailure: string };
    };
    expect(body.callerAvailability.available).toBe(true);
    expect(body.workerAvailability.firstFailure).toBe('unavailable_scope');
  });

  it('fails closed for the worker when its role cannot be read', async () => {
    const { detail, context, asCurrentUser } = makeDeps();
    asCurrentUser.security.getRole.mockRejectedValue({ statusCode: 403 });
    const response = httpServerMock.createResponseFactory();

    await detail(
      context,
      httpServerMock.createKibanaRequest({ params: { id: 'rare_lsass_process_access' } }),
      response
    );

    const body = response.ok.mock.calls[0][0]!.body as {
      workerAvailability: { failures: Array<{ details: string[] }> };
    };
    expect(body.workerAvailability.failures[0].details).toEqual(['worker_role_unreadable']);
  });

  it('serves a repeat list from the cache within 60 seconds', async () => {
    const { list, context, asCurrentUser } = makeDeps();

    await list(
      context,
      httpServerMock.createKibanaRequest(),
      httpServerMock.createResponseFactory()
    );
    const calls = asCurrentUser.esql.query.mock.calls.length;
    await list(
      context,
      httpServerMock.createKibanaRequest(),
      httpServerMock.createResponseFactory()
    );

    expect(asCurrentUser.esql.query).toHaveBeenCalledTimes(calls);
  });

  it('reports Elasticsearch failures as unavailable hunts instead of failing the list', async () => {
    const { list, context } = makeDeps();
    (await context.core).elasticsearch.client.asCurrentUser.indices.resolveIndex.mockRejectedValue(
      new Error('secret detail')
    );
    const response = httpServerMock.createResponseFactory();

    await list(context, httpServerMock.createKibanaRequest(), response);

    const { hunts } = response.ok.mock.calls[0][0]!.body as {
      hunts: Array<{
        availability: { firstFailure: string; failures: Array<{ details: string[] }> };
      }>;
    };
    expect(
      hunts.every(({ availability }) => availability.firstFailure === 'unavailable_index')
    ).toBe(true);
    expect(JSON.stringify(hunts)).not.toContain('secret detail');
  });
});
