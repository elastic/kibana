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
}: {
  elasticsearch?: ProfilingConfig['elasticsearch'];
  serverless?: boolean;
} = {}) {
  const router = httpServiceMock.createRouter();
  const getSetupState = jest.fn().mockResolvedValue({
    type: 'self-managed',
    setupState: {
      resource_management: { enabled: true },
      settings: { configured: true },
    },
  });
  const profilingStatus = jest.fn().mockResolvedValue({});
  const createProfilingEsClient = jest.fn().mockReturnValue({ profilingStatus });

  registerSetupRoute({
    router,
    logger: loggerMock.create(),
    services: { createProfilingEsClient },
    dependencies: {
      start: {
        profilingDataAccess: { services: { getSetupState } },
      },
      setup: {},
      config: { enabled: true, elasticsearch },
      stackVersion: '9.0.0',
      esCapabilities: { serverless },
    },
  } as unknown as RouteRegisterParameters);

  const paths = getRoutePaths();
  const routeEntry = router.post.mock.calls.find(
    ([{ path }]) => path === paths.HasSetupESResources
  );
  expect(routeEntry).toBeDefined();
  const handler = routeEntry![1] as (...args: unknown[]) => Promise<unknown>;

  const context = coreMock.createCustomRequestHandlerContext({
    core: coreMock.createRequestHandlerContext(),
  });
  const response = httpServerMock.createResponseFactory();

  return {
    getSetupState,
    createProfilingEsClient,
    response,
    postSetup: () => handler(context, httpServerMock.createKibanaRequest(), response),
  };
}

describe('POST /api/profiling/setup/es_resources', () => {
  it('rejects setup when a remote profiling cluster is configured', async () => {
    const { postSetup, response, getSetupState, createProfilingEsClient } = setup({
      elasticsearch: { hosts: 'https://remote:9200', username: 'elastic', password: 'changeme' },
    });

    await postSetup();

    expect(response.badRequest).toHaveBeenCalledWith({
      body: {
        message: expect.stringContaining('"xpack.profiling.elasticsearch" is configured'),
      },
    });
    // Setup must not read state from, or build a client against, the remote cluster.
    expect(getSetupState).not.toHaveBeenCalled();
    expect(createProfilingEsClient).not.toHaveBeenCalled();
  });

  it('rejects setup on serverless', async () => {
    const { postSetup, response, getSetupState } = setup({ serverless: true });

    await postSetup();

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: 'Serverless setup is not supported' },
    });
    expect(getSetupState).not.toHaveBeenCalled();
  });

  it('applies setup when no remote profiling cluster is configured', async () => {
    const { postSetup, response, getSetupState } = setup();

    await postSetup();

    expect(getSetupState).toHaveBeenCalled();
    expect(response.badRequest).not.toHaveBeenCalled();
    expect(response.accepted).toHaveBeenCalled();
  });
});
