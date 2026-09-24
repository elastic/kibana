/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { getRoutePaths } from '../../../common';
import type { ProfilingConfig } from '../..';
import type { RouteRegisterParameters } from '..';
import { registerSetupRoute } from './route';

function setup({
  elasticsearch,
  serverless = false,
  isCloudEnabled = false,
}: {
  elasticsearch?: ProfilingConfig['elasticsearch'];
  serverless?: boolean;
  isCloudEnabled?: boolean;
} = {}) {
  const router = httpServiceMock.createRouter();
  const getSelfManagedSetupState = jest.fn().mockResolvedValue({
    resource_management: { enabled: true },
    settings: { configured: true },
  });
  const getCloudSetupState = jest.fn();
  const getStatus = jest.fn().mockResolvedValue({
    profiling_enabled: true,
    has_setup: true,
    has_data: true,
    pre_8_9_1_data: false,
  });
  const profilingStatus = jest.fn().mockResolvedValue({});
  const createProfilingEsClient = jest.fn().mockReturnValue({ profilingStatus });

  registerSetupRoute({
    router,
    logger: loggerMock.create(),
    services: { createProfilingEsClient },
    dependencies: {
      start: {
        profilingDataAccess: {
          services: { getCloudSetupState, getSelfManagedSetupState, getStatus },
        },
      },
      setup: { cloud: { isCloudEnabled } },
      config: { enabled: true, elasticsearch },
      stackVersion: '9.0.0',
      esCapabilities: { serverless },
    },
  } as unknown as RouteRegisterParameters);

  const paths = getRoutePaths();
  const findHandler = (calls: Array<[{ path: string }, unknown]>) => {
    const routeEntry = calls.find(([{ path }]) => path === paths.HasSetupESResources);
    expect(routeEntry).toBeDefined();
    return routeEntry![1] as (...args: unknown[]) => Promise<unknown>;
  };
  const postHandler = findHandler(router.post.mock.calls);
  const getHandler = findHandler(router.get.mock.calls);

  const context = coreMock.createCustomRequestHandlerContext({
    core: coreMock.createRequestHandlerContext(),
  });
  const response = httpServerMock.createResponseFactory();

  return {
    getCloudSetupState,
    getSelfManagedSetupState,
    getStatus,
    createProfilingEsClient,
    response,
    postSetup: () => postHandler(context, httpServerMock.createKibanaRequest(), response),
    getSetupStatus: () => getHandler(context, httpServerMock.createKibanaRequest(), response),
  };
}

describe('POST /api/profiling/setup/es_resources', () => {
  it('rejects setup when a remote profiling cluster is configured', async () => {
    const {
      postSetup,
      response,
      getCloudSetupState,
      getSelfManagedSetupState,
      createProfilingEsClient,
    } = setup({
      elasticsearch: { hosts: 'https://remote:9200', username: 'elastic', password: 'changeme' },
    });

    await postSetup();

    expect(response.badRequest).toHaveBeenCalledWith({
      body: {
        message: expect.stringContaining('"xpack.profiling.elasticsearch" is configured'),
      },
    });
    // Setup must not read state from, or build a client against, the remote cluster.
    expect(getCloudSetupState).not.toHaveBeenCalled();
    expect(getSelfManagedSetupState).not.toHaveBeenCalled();
    expect(createProfilingEsClient).not.toHaveBeenCalled();
  });

  it('rejects setup on serverless', async () => {
    const { postSetup, response, getCloudSetupState, getSelfManagedSetupState } = setup({
      serverless: true,
    });

    await postSetup();

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: 'Serverless setup is not supported' },
    });
    expect(getCloudSetupState).not.toHaveBeenCalled();
    expect(getSelfManagedSetupState).not.toHaveBeenCalled();
  });

  it('rejects setup on cloud when Fleet is unavailable, before reading the setup state', async () => {
    const { postSetup, response, getCloudSetupState } = setup({ isCloudEnabled: true });

    await postSetup();

    expect(response.custom).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Elastic Fleet is required to set up Universal Profiling on Cloud' },
    });
    expect(getCloudSetupState).not.toHaveBeenCalled();
  });

  it('applies self-managed setup when cloud is not enabled', async () => {
    const { postSetup, response, getCloudSetupState, getSelfManagedSetupState } = setup();

    await postSetup();

    expect(getSelfManagedSetupState).toHaveBeenCalled();
    expect(getCloudSetupState).not.toHaveBeenCalled();
    expect(response.badRequest).not.toHaveBeenCalled();
    expect(response.accepted).toHaveBeenCalled();
  });
});

describe('GET /api/profiling/setup/es_resources', () => {
  it('rejects the request on serverless', async () => {
    const { getSetupStatus, response, getStatus } = setup({ serverless: true });

    await getSetupStatus();

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: 'Universal Profiling is not supported in serverless' },
    });
    expect(getStatus).not.toHaveBeenCalled();
  });

  it('returns the setup status on stateful deployments', async () => {
    const { getSetupStatus, response, getStatus } = setup();

    await getSetupStatus();

    expect(getStatus).toHaveBeenCalled();
    expect(response.badRequest).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        profiling_enabled: true,
        has_setup: true,
        has_data: true,
        pre_8_9_1_data: false,
        has_required_role: true,
      },
    });
  });
});
