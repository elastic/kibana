/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { FindOrCreateWorkerInvestigationResponse } from '@kbn/alertzero-common';
import type { RouteDependencies } from '../register_routes';
import { registerFindOrCreateWorkerInvestigationRoute } from './find_or_create_investigation';
import { runFindOrCreateWorkerInvestigation } from '../../services/investigations/find_or_create_worker_investigation';

jest.mock('../../services/investigations/find_or_create_worker_investigation', () => ({
  runFindOrCreateWorkerInvestigation: jest.fn(),
}));

const runFindOrCreateWorkerInvestigationMock =
  runFindOrCreateWorkerInvestigation as jest.MockedFunction<
    typeof runFindOrCreateWorkerInvestigation
  >;

const output: FindOrCreateWorkerInvestigationResponse = {
  investigationConversationId: 'investigation-1',
  created: true,
  reopened: false,
};

const makeDeps = ({
  spaceId = 'default',
  execution = { workflowId: 'system-security-rule-tuning-review' },
  workflowsManagement = true,
}: {
  spaceId?: string;
  /** What the workflows client returns for the execution the body names. */
  execution?: { workflowId?: string; originManagedWorkflowId?: string } | null;
  workflowsManagement?: boolean;
} = {}) => {
  const addVersion = jest.fn();
  const router = { versioned: { post: jest.fn().mockReturnValue({ addVersion }) } };
  const logger = loggingSystemMock.createLogger();
  const conversationClient = { create: jest.fn(), get: jest.fn(), patchMetadata: jest.fn() };
  const getScopedClient = jest.fn().mockResolvedValue(conversationClient);
  const reportTelemetryEvent = jest.fn().mockReturnValue(true);
  const getWorkflowExecution = jest.fn().mockResolvedValue(execution);

  registerFindOrCreateWorkerInvestigationRoute({
    router: router as unknown as RouteDependencies['router'],
    logger,
    getSpaceId: () => spaceId,
    getAgentBuilderConversations: () =>
      ({ getScopedClient } as unknown as ReturnType<
        RouteDependencies['getAgentBuilderConversations']
      >),
    getWorkflowsManagement: () =>
      workflowsManagement
        ? ({ getWorkflowExecution } as unknown as ReturnType<
            RouteDependencies['getWorkflowsManagement']
          >)
        : undefined,
    reportTelemetryEvent,
  } as unknown as RouteDependencies);

  const context = {
    alertzero: Promise.resolve({
      subscription: 'available',
      hasRequiredDependencies: true,
      isSpaceSupported: true,
    }),
    core: Promise.resolve({
      uiSettings: { client: { get: jest.fn().mockResolvedValue(true) } },
    }),
  };

  return {
    routeConfig: router.versioned.post.mock.calls[0][0],
    handler: addVersion.mock.calls[0][1] as (
      context: unknown,
      request: ReturnType<typeof httpServerMock.createKibanaRequest>,
      response: ReturnType<typeof httpServerMock.createResponseFactory>
    ) => Promise<unknown>,
    context,
    getScopedClient,
    conversationClient,
    logger,
    reportTelemetryEvent,
    getWorkflowExecution,
  };
};

const body = {
  workerId: 'system-security-detection-rule-coverage',
  subjectId: 'ki-1',
  title: 'Detection coverage: T1078',
  description: 'Valid account abuse.',
  workflowExecutionId: 'run-1',
};

const requestFor = (overrides: Record<string, unknown> = {}) =>
  httpServerMock.createKibanaRequest({ body: { ...body, ...overrides } });

describe('registerFindOrCreateWorkerInvestigationRoute', () => {
  beforeEach(() => {
    runFindOrCreateWorkerInvestigationMock.mockReset().mockResolvedValue(output);
  });

  it('registers at the shared constant path', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.path).toBe('/internal/alertzero/investigations/find_or_create');
  });

  it('requires write privilege and Agent Builder access, because it mints a public Investigation conversation', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.security.authz.requiredPrivileges).toEqual([
      'alertzero_write',
      'agentBuilder:read',
    ]);
  });

  it('is an internal route', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.access).toBe('internal');
  });

  it('is gated by withAlertZeroEnabled: 404s when the space setting is off, without calling the service', async () => {
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();
    const gatedContext = {
      ...context,
      core: Promise.resolve({
        uiSettings: { client: { get: jest.fn().mockResolvedValue(false) } },
      }),
    };

    await handler(gatedContext, requestFor(), response);

    expect(response.notFound).toHaveBeenCalled();
    expect(runFindOrCreateWorkerInvestigationMock).not.toHaveBeenCalled();
  });

  it('runs against the request space with the subject the body names', async () => {
    const { handler, context } = makeDeps({ spaceId: 'soc' });

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(runFindOrCreateWorkerInvestigationMock).toHaveBeenCalledWith(
      { spaceId: 'soc', ...body },
      expect.objectContaining({ conversationClient: expect.anything() })
    );
  });

  it('scopes the conversation client to the request', async () => {
    const { handler, context, getScopedClient, conversationClient } = makeDeps();
    const request = requestFor();

    await handler(context, request, httpServerMock.createResponseFactory());

    expect(getScopedClient).toHaveBeenCalledWith({ request });
    expect(runFindOrCreateWorkerInvestigationMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ conversationClient })
    );
  });

  it("reports a reopen as the Worker the body names once its execution is one of that Worker's reviews", async () => {
    const { handler, context, reportTelemetryEvent, getWorkflowExecution } = makeDeps({
      spaceId: 'soc',
    });

    const request = requestFor({ workerId: 'system-security-detection-rule-tuning' });
    await handler(context, request, httpServerMock.createResponseFactory());
    const { onReopened } = runFindOrCreateWorkerInvestigationMock.mock.calls[0][1];
    await onReopened?.('3f1c2b4a-5d6e-5f70-8a9b-0c1d2e3f4a5b');

    expect(getWorkflowExecution).toHaveBeenCalledWith('run-1', 'soc', request);
    expect(reportTelemetryEvent.mock.calls).toEqual([
      [
        'alertzero_worker_investigation_reopened',
        {
          investigation_id: '3f1c2b4a-5d6e-5f70-8a9b-0c1d2e3f4a5b',
          is_default_space: false,
          watch_tag: 'watch-detection',
          worker_id: 'system-security-detection-rule-tuning',
        },
      ],
    ]);
  });

  it('counts a managed run of the review by its origin workflow id too', async () => {
    const { handler, context, reportTelemetryEvent } = makeDeps({
      execution: {
        workflowId: 'some-installed-copy',
        originManagedWorkflowId: 'system-security-coverage-review',
      },
    });

    await handler(context, requestFor(), httpServerMock.createResponseFactory());
    await runFindOrCreateWorkerInvestigationMock.mock.calls[0][1].onReopened?.('inv-1');

    expect(reportTelemetryEvent).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['the execution belongs to another workflow', { workflowId: 'system-security-journal-note' }],
    [
      "the execution belongs to the other Worker's review",
      { workflowId: 'system-security-rule-tuning-review' },
    ],
    ['no execution exists under that id', null],
  ])("does not count a reopen as the Worker's when %s", async (_scenario, execution) => {
    const { handler, context, reportTelemetryEvent, logger } = makeDeps({ execution });

    await handler(context, requestFor(), httpServerMock.createResponseFactory());
    await runFindOrCreateWorkerInvestigationMock.mock.calls[0][1].onReopened?.('inv-1');

    expect(reportTelemetryEvent).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('not a system-security-detection-rule-coverage review')
    );
  });

  it('does not count a reopen the body ties to no execution, without looking one up', async () => {
    const { handler, context, reportTelemetryEvent, getWorkflowExecution } = makeDeps();

    await handler(
      context,
      requestFor({ workflowExecutionId: undefined }),
      httpServerMock.createResponseFactory()
    );
    await runFindOrCreateWorkerInvestigationMock.mock.calls[0][1].onReopened?.('inv-1');

    expect(getWorkflowExecution).not.toHaveBeenCalled();
    expect(reportTelemetryEvent).not.toHaveBeenCalled();
  });

  it('does not count a reopen when workflows management is unavailable', async () => {
    const { handler, context, reportTelemetryEvent } = makeDeps({ workflowsManagement: false });

    await handler(context, requestFor(), httpServerMock.createResponseFactory());
    await runFindOrCreateWorkerInvestigationMock.mock.calls[0][1].onReopened?.('inv-1');

    expect(reportTelemetryEvent).not.toHaveBeenCalled();
  });

  it('reports nothing when the find-or-create reopened nothing', async () => {
    const { handler, context, reportTelemetryEvent } = makeDeps();

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(reportTelemetryEvent).not.toHaveBeenCalled();
  });

  it('returns the find-or-create output as the response body', async () => {
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(response.ok).toHaveBeenCalledWith({ body: output });
  });

  it('logs and returns a generic 500 when the service throws', async () => {
    runFindOrCreateWorkerInvestigationMock.mockRejectedValue(
      new Error('conversation store unavailable')
    );
    const { handler, context, logger } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('conversation store unavailable')
    );
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Find-or-create Investigation failed' },
    });
  });
});
