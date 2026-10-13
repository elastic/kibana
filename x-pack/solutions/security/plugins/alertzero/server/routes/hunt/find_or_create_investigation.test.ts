/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { FindOrCreateInvestigationResponse } from '@kbn/alertzero-common';
import type { RouteDependencies } from '../register_routes';
import { registerFindOrCreateInvestigationRoute } from './find_or_create_investigation';
import { runFindOrCreateInvestigation } from '../../services/watches/hunt/common/find_or_create_investigation';
import { loadReportHuntContext } from '../../services/watches/hunt/common/load_report_context';

jest.mock('../../services/watches/hunt/common/find_or_create_investigation', () => ({
  runFindOrCreateInvestigation: jest.fn(),
}));
jest.mock('../../services/watches/hunt/common/load_report_context', () => ({
  loadReportHuntContext: jest.fn(),
}));

const runFindOrCreateInvestigationMock = runFindOrCreateInvestigation as jest.MockedFunction<
  typeof runFindOrCreateInvestigation
>;
const loadReportHuntContextMock = loadReportHuntContext as jest.MockedFunction<
  typeof loadReportHuntContext
>;

const output: FindOrCreateInvestigationResponse = {
  investigationConversationId: 'investigation-1',
  triggerAttachmentId: 'trigger-1',
  created: true,
};

const makeDeps = ({ spaceId = 'default' }: { spaceId?: string } = {}) => {
  const addVersion = jest.fn();
  const router = { versioned: { post: jest.fn().mockReturnValue({ addVersion }) } };
  const logger = loggingSystemMock.createLogger();
  const conversationClient = { create: jest.fn(), get: jest.fn() };
  const getScopedClient = jest.fn().mockResolvedValue(conversationClient);

  registerFindOrCreateInvestigationRoute({
    router: router as unknown as RouteDependencies['router'],
    logger,
    getSpaceId: () => spaceId,
    getAgentBuilderConversations: () =>
      ({ getScopedClient } as unknown as ReturnType<
        RouteDependencies['getAgentBuilderConversations']
      >),
  } as unknown as RouteDependencies);

  const asInternalUser = { search: jest.fn() };
  const context = {
    alertzero: Promise.resolve({ subscription: 'available', hasRequiredDependencies: true }),
    core: Promise.resolve({
      elasticsearch: { client: { asInternalUser } },
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
    asInternalUser,
    getScopedClient,
    conversationClient,
    logger,
  };
};

const requestFor = (body: Record<string, unknown> = {}) =>
  httpServerMock.createKibanaRequest({ body: { reportId: 'report-1', ...body } });

describe('registerFindOrCreateInvestigationRoute', () => {
  beforeEach(() => {
    runFindOrCreateInvestigationMock.mockReset().mockResolvedValue(output);
    loadReportHuntContextMock.mockReset().mockResolvedValue(null);
  });

  it('requires write privilege, because it mints an Investigation conversation', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.security.authz.requiredPrivileges).toEqual(['alertzero_write']);
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
        elasticsearch: { client: { asInternalUser: { search: jest.fn() } } },
        uiSettings: { client: { get: jest.fn().mockResolvedValue(false) } },
      }),
    };

    await handler(gatedContext, requestFor(), response);

    expect(response.notFound).toHaveBeenCalled();
    expect(runFindOrCreateInvestigationMock).not.toHaveBeenCalled();
  });

  it('runs against the request space, not the default one', async () => {
    const { handler, context } = makeDeps({ spaceId: 'hunt-space' });

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(runFindOrCreateInvestigationMock).toHaveBeenCalledWith(
      { spaceId: 'hunt-space', reportId: 'report-1' },
      expect.objectContaining({ conversationClient: expect.anything() })
    );
  });

  it('loads the report as the internal user, not the enabling user, since the reports index is hidden', async () => {
    const { handler, context, asInternalUser } = makeDeps();

    await handler(
      context,
      requestFor({ reportId: 'report-9' }),
      httpServerMock.createResponseFactory()
    );

    const { loadReport } = runFindOrCreateInvestigationMock.mock.calls[0][1];
    await loadReport?.();

    expect(loadReportHuntContextMock).toHaveBeenCalledWith({
      esClient: asInternalUser,
      spaceId: 'default',
      reportId: 'report-9',
    });
  });

  it('scopes the conversation client to the request', async () => {
    const { handler, context, getScopedClient, conversationClient } = makeDeps();
    const request = requestFor();

    await handler(context, request, httpServerMock.createResponseFactory());

    expect(getScopedClient).toHaveBeenCalledWith({ request });
    expect(runFindOrCreateInvestigationMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ conversationClient })
    );
  });

  it('returns the find-or-create output as the response body', async () => {
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(response.ok).toHaveBeenCalledWith({ body: output });
  });

  it('logs and returns a generic 500 when the service throws', async () => {
    runFindOrCreateInvestigationMock.mockRejectedValue(new Error('conversation store unavailable'));
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
