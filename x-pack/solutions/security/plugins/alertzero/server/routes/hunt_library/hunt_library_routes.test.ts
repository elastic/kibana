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
  const post = jest.fn();
  const addVersion = jest.fn();
  get.mockReturnValue({ addVersion });
  post.mockReturnValue({ addVersion });
  const router = { versioned: { get, post } };
  const management = {
    findExecutionsByLabel: jest.fn().mockResolvedValue([]),
    executeLabeledWorkflow: jest
      .fn()
      .mockResolvedValue({ workflowExecutionId: 'x', reusedExisting: false }),
    updateExecutionLabels: jest.fn().mockResolvedValue({}),
  };
  const managementRef: { current: typeof management | undefined } = { current: management };

  registerHuntLibraryRoutes({
    router: router as unknown as RouteDependencies['router'],
    logger: loggingSystemMock.createLogger(),
    getSpaceId: () => 'default',
    getWorkflowsManagement: () => managementRef.current,
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
    historyRoute: get.mock.calls[2][0],
    history: addVersion.mock.calls[2][1],
    launchRoute: post.mock.calls[0][0],
    launch: addVersion.mock.calls[3][1],
    launchValidate: addVersion.mock.calls[3][0].validate,
    management,
    managementRef,
    context,
    asCurrentUser,
  };
};

describe('registerHuntLibraryRoutes', () => {
  it('requires only AlertZero Read and is internal, for every read route', () => {
    const { listRoute, detailRoute, historyRoute } = makeDeps();

    for (const route of [listRoute, detailRoute, historyRoute]) {
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

describe('hunt launch route', () => {
  const SESSION = '0b7c1a3e-5d2f-4c8a-9e61-3f4b8a7d2c10';
  const launchRequest = (id = 'rare_lsass_process_access', sessionId = SESSION) =>
    httpServerMock.createKibanaRequest({ params: { id }, body: { session_id: sessionId } });

  it('requires only AlertZero Read and is internal', () => {
    const { launchRoute } = makeDeps();

    expect(launchRoute.access).toBe('internal');
    expect(launchRoute.security.authz.requiredPrivileges).toEqual(['alertzero_read']);
  });

  it('bounds the body to one UUID session id', () => {
    const { launchValidate } = makeDeps();
    const body = launchValidate.request.body;

    expect(body.validate({ session_id: SESSION })).toEqual({ session_id: SESSION });
    expect(() => body.validate({ session_id: 'not-a-uuid' })).toThrow();
    expect(() => body.validate({ session_id: 'a'.repeat(37) })).toThrow();
    expect(() => body.validate({})).toThrow();
    expect(() => body.validate({ session_id: SESSION, space_id: 'other' })).toThrow();
  });

  it('records an exploratory session for an available hunt and creates no Investigation', async () => {
    const { launch, context, management } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await launch(context, launchRequest(), response);

    expect(management.executeLabeledWorkflow).toHaveBeenCalledTimes(1);
    const body = response.ok.mock.calls[0][0]!.body as {
      session_id: string;
      execution_id: string;
      reused_existing: boolean;
    };
    expect(body.session_id).toBe(SESSION);
    expect(body.execution_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.reused_existing).toBe(false);
  });

  it('refuses to launch a hunt that is not available to the caller, and writes nothing', async () => {
    const { launch, context, management } = makeDeps({ universe: ['filebeat-*'] });
    const response = httpServerMock.createResponseFactory();

    await launch(context, launchRequest(), response);

    expect(response.conflict).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ attributes: { reason: 'unavailable_scope' } }),
      })
    );
    expect(management.executeLabeledWorkflow).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown hunt without touching Workflows', async () => {
    const { launch, context, management } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await launch(context, launchRequest('nope'), response);

    expect(response.notFound).toHaveBeenCalled();
    expect(management.findExecutionsByLabel).not.toHaveBeenCalled();
  });

  it('returns 409 when the session id belongs to a different hunt', async () => {
    const { launch, context, management } = makeDeps();
    management.findExecutionsByLabel.mockResolvedValue([
      { labels: { 'hunt.definition_id': 'okta_password_spraying_repeat_source' } },
    ]);
    const response = httpServerMock.createResponseFactory();

    await launch(context, launchRequest(), response);

    expect(response.conflict).toHaveBeenCalled();
    expect(management.executeLabeledWorkflow).not.toHaveBeenCalled();
  });

  it('returns 503 when Workflows management is unavailable', async () => {
    const { launch, context, managementRef } = makeDeps();
    managementRef.current = undefined;
    const response = httpServerMock.createResponseFactory();

    await launch(context, launchRequest(), response);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it('returns a generic 500 when the workflow cannot start', async () => {
    const { launch, context, management } = makeDeps();
    management.executeLabeledWorkflow.mockRejectedValue(new Error('secret detail'));
    const response = httpServerMock.createResponseFactory();

    await launch(context, launchRequest(), response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to launch Hunt Library session' },
    });
  });

  describe('history', () => {
    const historyRequest = (id = 'rare_lsass_process_access') =>
      httpServerMock.createKibanaRequest({ params: { id } });

    it('returns the hunt sessions grouped by session, newest first', async () => {
      const { history, context, management } = makeDeps();
      const labels = (sessionId: string, outcome?: string) => ({
        'hunt.kind': 'manual_session',
        'hunt.definition_id': 'rare_lsass_process_access',
        'hunt.definition_version': '1',
        'hunt.session_id': sessionId,
        ...(outcome ? { 'hunt.outcome': outcome } : {}),
      });
      management.findExecutionsByLabel.mockResolvedValue([
        {
          id: 'e2',
          startedAt: '2026-11-03T10:00:00.000Z',
          executedBy: 'analyst',
          labels: labels('s2'),
        },
        { id: 'e1', startedAt: '2026-11-02T10:00:00.000Z', labels: labels('s1', 'exploratory') },
        { id: 'e1b', startedAt: '2026-11-02T09:00:00.000Z', labels: labels('s1') },
      ]);
      const response = httpServerMock.createResponseFactory();

      await history(context, historyRequest(), response);

      expect(management.findExecutionsByLabel).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'hunt.definition_id', value: 'rare_lsass_process_access' })
      );
      expect(response.ok.mock.calls[0][0]!.body).toEqual({
        history: [
          {
            kind: 'manual_session',
            sessionId: 's2',
            executionId: 'e2',
            definitionVersion: 1,
            outcome: 'exploratory',
            startedAt: '2026-11-03T10:00:00.000Z',
            startedBy: 'analyst',
          },
          {
            kind: 'manual_session',
            sessionId: 's1',
            executionId: 'e1',
            definitionVersion: 1,
            outcome: 'exploratory',
            startedAt: '2026-11-02T10:00:00.000Z',
          },
        ],
      });
    });

    it('skips executions that are not manual sessions', async () => {
      const { history, context, management } = makeDeps();
      management.findExecutionsByLabel.mockResolvedValue([
        {
          id: 'e1',
          startedAt: '2026-11-03T10:00:00.000Z',
          labels: { 'hunt.kind': 'library_child', 'hunt.session_id': 's1' },
        },
      ]);
      const response = httpServerMock.createResponseFactory();

      await history(context, historyRequest(), response);

      expect(response.ok.mock.calls[0][0]!.body).toEqual({ history: [] });
    });

    it('returns 404 for an unknown hunt without touching Workflows', async () => {
      const { history, context, management } = makeDeps();
      const response = httpServerMock.createResponseFactory();

      await history(context, historyRequest('nope'), response);

      expect(response.notFound).toHaveBeenCalled();
      expect(management.findExecutionsByLabel).not.toHaveBeenCalled();
    });

    it('returns 503 when Workflows management is unavailable', async () => {
      const { history, context, managementRef } = makeDeps();
      managementRef.current = undefined;
      const response = httpServerMock.createResponseFactory();

      await history(context, historyRequest(), response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 503 })
      );
    });

    it('returns a generic 500 without leaking the failure', async () => {
      const { history, context, management } = makeDeps();
      management.findExecutionsByLabel.mockRejectedValue(new Error('secret detail'));
      const response = httpServerMock.createResponseFactory();

      await history(context, historyRequest(), response);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'Failed to read Hunt Library history' },
      });
    });
  });
});
