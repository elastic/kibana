/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { RouteDependencies } from '../register_routes';
import { registerHuntHandoffCleanupRoute } from './handoff_cleanup_route';

const mockCleanup = jest.fn();
jest.mock('../../hunt_library/handoff_cleanup', () => ({
  ...jest.requireActual('../../hunt_library/handoff_cleanup'),
  runHandoffCleanup: (...args: unknown[]) => mockCleanup(...args),
}));

const EXECUTION = 'execution-1';

const makeDeps = ({
  byOutcome = {} as Record<string, Array<{ id: string; labels: Record<string, string> }>>,
  management = true,
}: {
  byOutcome?: Record<string, Array<{ id: string; labels: Record<string, string> }>>;
  management?: boolean;
} = {}) => {
  const post = jest.fn();
  const addVersion = jest.fn();
  post.mockReturnValue({ addVersion });
  const findExecutionsByLabel = jest.fn(
    async ({ value }: { value: string }) => byOutcome[value] ?? []
  );
  registerHuntHandoffCleanupRoute({
    router: { versioned: { post } } as unknown as RouteDependencies['router'],
    logger: loggingSystemMock.createLogger(),
    getSpaceId: () => 'default',
    getWorkflowsManagement: () => (management ? { findExecutionsByLabel } : undefined),
    getAgentBuilderConversations: () => ({ getScopedClient: async () => ({ conv: true }) }),
    getAgentBuilderAttachments: () => ({ getScopedClient: async () => ({ att: true }) }),
  } as unknown as RouteDependencies);
  return {
    route: post.mock.calls[0][0],
    handler: addVersion.mock.calls[0][1],
    validate: addVersion.mock.calls[0][0].validate,
    findExecutionsByLabel,
    context: {
      alertzero: Promise.resolve({
        subscription: 'available',
        hasRequiredDependencies: true,
        isSpaceSupported: true,
      }),
      core: Promise.resolve({ uiSettings: { client: { get: jest.fn().mockResolvedValue(true) } } }),
    },
  };
};

const call = async (deps: ReturnType<typeof makeDeps>) => {
  const response = httpServerMock.createResponseFactory();
  await deps.handler(
    deps.context,
    httpServerMock.createKibanaRequest({ body: { executionId: EXECUTION } }),
    response
  );
  return response;
};

describe('hunt handoff cleanup retry route', () => {
  beforeEach(() => mockCleanup.mockReset());

  it('is internal, at the documented path, and needs AlertZero All', () => {
    const { route } = makeDeps();

    expect(route.path).toBe('/internal/alertzero/hunt/handoff_cleanup/retry');
    expect(route.access).toBe('internal');
    expect(route.security.authz.requiredPrivileges).toEqual(['alertzero_write']);
  });

  it('bounds the body to one execution id and rejects a client-supplied space', () => {
    const { validate } = makeDeps();
    const schema = validate.request.body;

    expect(() => schema.validate({ executionId: EXECUTION })).not.toThrow();
    expect(() => schema.validate({})).toThrow();
    expect(() => schema.validate({ executionId: '' })).toThrow();
    expect(() => schema.validate({ executionId: 'a'.repeat(129) })).toThrow();
    expect(() => schema.validate({ executionId: EXECUTION, space_id: 'x' })).toThrow();
  });

  it('re-queues an exhausted session from attempt zero and runs the cleanup now', async () => {
    mockCleanup.mockResolvedValue('repaired');
    const deps = makeDeps({
      byOutcome: {
        handoff_cleanup_exhausted: [
          {
            id: EXECUTION,
            labels: {
              'hunt.outcome': 'handoff_cleanup_exhausted',
              'hunt.reason_code': 'cleanup_attempt_20',
            },
          },
        ],
      },
    });

    const response = await call(deps);

    expect(response.ok).toHaveBeenCalledWith({ body: { result: 'repaired' } });
    expect(mockCleanup).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'default',
        executionId: EXECUTION,
        labels: expect.objectContaining({
          'hunt.outcome': 'handoff_cleanup_required',
          'hunt.reason_code': '-',
        }),
      })
    );
  });

  it('runs the cleanup for a session flagged for cleanup, keeping its attempt count', async () => {
    mockCleanup.mockResolvedValue('retry_later');
    const deps = makeDeps({
      byOutcome: {
        handoff_cleanup_required: [
          {
            id: EXECUTION,
            labels: {
              'hunt.outcome': 'handoff_cleanup_required',
              'hunt.reason_code': 'cleanup_attempt_4',
            },
          },
        ],
      },
    });

    const response = await call(deps);

    expect(response.ok).toHaveBeenCalledWith({ body: { result: 'retry_later' } });
    expect(mockCleanup).toHaveBeenCalledWith(
      expect.objectContaining({
        labels: expect.objectContaining({ 'hunt.reason_code': 'cleanup_attempt_4' }),
      })
    );
  });

  it('leaves a handoff that is still in progress alone', async () => {
    const deps = makeDeps({
      byOutcome: {
        pending_handoff: [
          {
            id: EXECUTION,
            labels: {
              'hunt.outcome': 'pending_handoff',
              'hunt.last_handoff_at': new Date().toISOString(),
            },
          },
        ],
      },
    });

    const response = await call(deps);

    expect(response.conflict).toHaveBeenCalled();
    expect(mockCleanup).not.toHaveBeenCalled();
  });

  it('returns 404 for an execution that is not stuck, and does not clean up', async () => {
    const deps = makeDeps({
      byOutcome: { handoff_cleanup_required: [{ id: 'other', labels: {} }] },
    });

    const response = await call(deps);

    expect(response.notFound).toHaveBeenCalled();
    expect(mockCleanup).not.toHaveBeenCalled();
  });

  it('only looks in the request space', async () => {
    const deps = makeDeps();

    await call(deps);

    expect(deps.findExecutionsByLabel).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default' })
    );
  });

  it('returns 503 without Workflows management', async () => {
    const response = await call(makeDeps({ management: false }));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it('returns a generic 500 without leaking the failure', async () => {
    mockCleanup.mockRejectedValue(new Error('secret detail'));
    const deps = makeDeps({
      byOutcome: {
        handoff_cleanup_required: [
          { id: EXECUTION, labels: { 'hunt.outcome': 'handoff_cleanup_required' } },
        ],
      },
    });

    const response = await call(deps);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to retry the handoff cleanup' },
    });
  });
});
