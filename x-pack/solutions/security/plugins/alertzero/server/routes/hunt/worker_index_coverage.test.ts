/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { RouteDependencies } from '../register_routes';
import { registerHuntWorkerIndexCoverageRoute } from './worker_index_coverage';
import { resolveWorkerIndexCoverage } from '../../services/watches/hunt/common/resolve_worker_index_coverage';

jest.mock('../../services/watches/hunt/common/resolve_worker_index_coverage', () => ({
  ...jest.requireActual('../../services/watches/hunt/common/resolve_worker_index_coverage'),
  resolveWorkerIndexCoverage: jest.fn(),
}));

const resolveMock = resolveWorkerIndexCoverage as jest.MockedFunction<
  typeof resolveWorkerIndexCoverage
>;

const coverage = {
  universe: ['logs-*'],
  unreadable_by_worker: [],
  missing_for_everyone: [],
  source: 'role' as const,
  checked_at: 'now',
  service_account_id: null,
  role_name: 'alertzero_threat_hunt',
  account_label: 'alertzero_threat_hunt',
  is_serverless: false,
};

const makeDeps = ({
  isServerless = false,
  management = {},
}: { isServerless?: boolean; management?: object | null } = {}) => {
  const addVersion = jest.fn();
  const router = { versioned: { get: jest.fn().mockReturnValue({ addVersion }) } };
  const logger = loggingSystemMock.createLogger();
  const getHuntCoverageInputs = jest
    .fn()
    .mockResolvedValue({ workflowId: 'wf-1', serviceAccountId: 'kibana/alertzero_threat_hunt' });
  const workersService = { getHuntCoverageInputs, get: jest.fn() };
  const clusterClient = elasticsearchServiceMock.createClusterClient();
  const scoped = elasticsearchServiceMock.createScopedClusterClient();
  clusterClient.asScoped.mockReturnValue(scoped);

  registerHuntWorkerIndexCoverageRoute({
    router: router as unknown as RouteDependencies['router'],
    logger,
    getSpaceId: () => 'space-a',
    getClusterClient: () => clusterClient,
    getWorkersService: () => workersService,
    getWorkflowsManagement: () => management ?? undefined,
    isServerless,
  } as unknown as RouteDependencies);

  const context = {
    alertzero: Promise.resolve({
      subscription: 'available',
      hasRequiredDependencies: true,
      isSpaceSupported: true,
    }),
    core: Promise.resolve({
      uiSettings: { client: { get: jest.fn().mockResolvedValue(['logs-*']) } },
    }),
  };
  return {
    routeConfig: router.versioned.get.mock.calls[0][0],
    handler: addVersion.mock.calls[0][1] as (
      context: unknown,
      request: ReturnType<typeof httpServerMock.createKibanaRequest>,
      response: ReturnType<typeof httpServerMock.createResponseFactory>
    ) => Promise<unknown>,
    context,
    workersService,
    getHuntCoverageInputs,
    clusterClient,
    scoped,
  };
};

describe('registerHuntWorkerIndexCoverageRoute', () => {
  beforeEach(() => {
    resolveMock.mockReset().mockResolvedValue(coverage);
  });

  it('requires only read privilege on an internal route', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.security.authz.requiredPrivileges).toEqual(['alertzero_read']);
  });

  it('scopes the client to the request with the space project routing', async () => {
    const { handler, context, clusterClient } = makeDeps();
    const request = httpServerMock.createKibanaRequest();

    await handler(context, request, httpServerMock.createResponseFactory());

    expect(clusterClient.asScoped).toHaveBeenCalledWith(request, { projectRouting: 'space' });
  });

  it('passes the workflow and account the service read, as the current user', async () => {
    const { handler, context, scoped } = makeDeps();

    await handler(
      context,
      httpServerMock.createKibanaRequest(),
      httpServerMock.createResponseFactory()
    );

    expect(resolveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        esClient: scoped.asCurrentUser,
        spaceId: 'space-a',
        workflowId: 'wf-1',
        serviceAccountId: 'kibana/alertzero_threat_hunt',
        indexPatterns: ['logs-*'],
      })
    );
  });

  it('uses the stateful role name when not serverless', async () => {
    const { handler, context } = makeDeps({ isServerless: false });

    await handler(
      context,
      httpServerMock.createKibanaRequest(),
      httpServerMock.createResponseFactory()
    );

    expect(resolveMock).toHaveBeenCalledWith(
      expect.objectContaining({ roleName: 'alertzero_threat_hunt', isServerless: false })
    );
  });

  it('uses the underscore-prefixed role name on serverless', async () => {
    const { handler, context } = makeDeps({ isServerless: true });

    await handler(
      context,
      httpServerMock.createKibanaRequest(),
      httpServerMock.createResponseFactory()
    );

    expect(resolveMock).toHaveBeenCalledWith(
      expect.objectContaining({ roleName: '_alertzero_threat_hunt', isServerless: true })
    );
  });

  it('never goes through WorkersService.get', async () => {
    const { handler, context, workersService } = makeDeps();

    await handler(
      context,
      httpServerMock.createKibanaRequest(),
      httpServerMock.createResponseFactory()
    );

    expect(workersService.get).not.toHaveBeenCalled();
  });

  it('answers through the role path when workflows management is absent', async () => {
    const { handler, context } = makeDeps({ management: null });

    await handler(
      context,
      httpServerMock.createKibanaRequest(),
      httpServerMock.createResponseFactory()
    );

    expect(resolveMock).toHaveBeenCalledWith(expect.objectContaining({ management: undefined }));
  });

  it('returns the coverage body', async () => {
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, httpServerMock.createKibanaRequest(), response);

    expect(response.ok).toHaveBeenCalledWith({ body: coverage });
  });

  it('answers 500 when the service rejects', async () => {
    resolveMock.mockRejectedValue(new Error('es down'));
    const { handler, context } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, httpServerMock.createKibanaRequest(), response);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
