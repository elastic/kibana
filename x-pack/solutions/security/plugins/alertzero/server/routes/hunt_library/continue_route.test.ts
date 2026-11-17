/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ApiPrivileges } from '@kbn/core-security-server';
import type { RouteDependencies } from '../register_routes';
import { HuntContinueError } from '../../hunt_library/continue_session';
import { registerHuntContinueRoute } from './continue_route';

const mockContinue = jest.fn();
jest.mock('../../hunt_library/continue_session', () => ({
  ...jest.requireActual('../../hunt_library/continue_session'),
  continueHuntSession: (...args: unknown[]) => mockContinue(...args),
}));

const makeDeps = ({
  management = {} as unknown | null,
}: {
  management?: unknown | null;
} = {}) => {
  const post = jest.fn();
  const addVersion = jest.fn();
  post.mockReturnValue({ addVersion });
  const reportTelemetryEvent = jest.fn();
  registerHuntContinueRoute({
    router: { versioned: { post } } as unknown as RouteDependencies['router'],
    logger: loggingSystemMock.createLogger(),
    getSpaceId: () => 'default',
    getWorkflowsManagement: () => management ?? undefined,
    getAgentBuilderConversations: () => ({ getScopedClient: async () => ({}) }),
    getAgentBuilderAttachments: () => ({ getScopedClient: async () => ({}) }),
    reportTelemetryEvent,
  } as unknown as RouteDependencies);
  const context = {
    alertzero: Promise.resolve({
      subscription: 'available',
      hasRequiredDependencies: true,
      isSpaceSupported: true,
    }),
    core: Promise.resolve({ uiSettings: { client: { get: jest.fn().mockResolvedValue(true) } } }),
  };
  return {
    route: post.mock.calls[0][0],
    handler: addVersion.mock.calls[0][1],
    validate: addVersion.mock.calls[0][0].validate,
    context,
    reportTelemetryEvent,
  };
};

const call = async (deps: ReturnType<typeof makeDeps>) => {
  const response = httpServerMock.createResponseFactory();
  await deps.handler(
    deps.context,
    httpServerMock.createKibanaRequest({ body: { investigation_id: 'inv-1' } }),
    response
  );
  return response;
};

describe('hunt continue route', () => {
  beforeEach(() => mockContinue.mockReset());

  it('is internal and needs AlertZero Read and manage_investigations', () => {
    const { route } = makeDeps();

    expect(route.access).toBe('internal');
    expect(route.security.authz.requiredPrivileges).toEqual([
      'alertzero_read',
      ApiPrivileges.manage('investigations'),
    ]);
  });

  it('bounds the body to one Investigation id and rejects a client-supplied space', () => {
    const { validate } = makeDeps();
    const schema = validate.request.body;

    expect(() => schema.validate({ investigation_id: 'inv-1' })).not.toThrow();
    expect(() => schema.validate({})).toThrow();
    expect(() => schema.validate({ investigation_id: '' })).toThrow();
    expect(() => schema.validate({ investigation_id: 'a'.repeat(257) })).toThrow();
    expect(() => schema.validate({ investigation_id: 'inv-1', space_id: 'x' })).toThrow();
  });

  it('returns what the service resolves, in the request space', async () => {
    mockContinue.mockResolvedValue({ session_id: 's', profile_token: 't' });
    const deps = makeDeps();

    const response = await call(deps);

    expect(response.ok).toHaveBeenCalledWith({ body: { session_id: 's', profile_token: 't' } });
    expect(mockContinue).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default', investigationId: 'inv-1' })
    );
  });

  it('reports a continued hunt with only its hunt id, and nothing when it fails', async () => {
    mockContinue.mockResolvedValueOnce({ session_id: 's', definition_id: 'hunt-a' });
    const deps = makeDeps();

    await call(deps);

    expect(deps.reportTelemetryEvent).toHaveBeenCalledTimes(1);
    expect(deps.reportTelemetryEvent).toHaveBeenCalledWith('alertzero_hunt_continued', {
      hunt_id: 'hunt-a',
    });

    mockContinue.mockRejectedValueOnce(new HuntContinueError('no_hunt_session', 'none'));
    const failed = makeDeps();
    await call(failed);
    expect(failed.reportTelemetryEvent).not.toHaveBeenCalled();
  });

  it.each([
    ['investigation_inaccessible', 403],
    ['no_hunt_session', 404],
    ['definition_changed', 409],
  ] as const)('maps %s to %s', async (code, statusCode) => {
    const error = new HuntContinueError(code, 'message');
    mockContinue.mockRejectedValue(error);

    const response = await call(makeDeps());

    expect(response.customError).toHaveBeenCalledWith({
      statusCode,
      body: { message: 'message', attributes: { reason: code } },
    });
  });

  it('returns 503 when Workflows management is not available', async () => {
    for (const deps of [makeDeps({ management: null })]) {
      const response = await call(deps);
      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 503 })
      );
    }
    expect(mockContinue).not.toHaveBeenCalled();
  });

  it('returns a generic 500 for an unexpected failure without leaking it', async () => {
    mockContinue.mockRejectedValue(new Error('secret detail'));

    const response = await call(makeDeps());

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to continue the hunt' },
    });
  });
});
