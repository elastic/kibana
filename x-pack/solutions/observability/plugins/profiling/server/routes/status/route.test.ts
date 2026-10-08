/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { ProfilingSchemasStatus } from '@kbn/profiling-utils';
import { getRoutePaths } from '../../../common';
import type { RouteRegisterParameters } from '..';
import { getHasSetupPrivileges } from '../universal_profiling/setup/lib/get_has_setup_privileges';
import { registerStatusRoute } from './route';

jest.mock('../universal_profiling/setup/lib/get_has_setup_privileges', () => ({
  getHasSetupPrivileges: jest.fn(),
}));

const mockedGetHasSetupPrivileges = jest.mocked(getHasSetupPrivileges);

// Universal Profiling isn't set up, the only case where the setup privileges are checked.
const schemasStatus: ProfilingSchemasStatus = {
  isEnabled: true,
  otel: { isAvailable: true, hasData: true },
  universalProfiling: {
    isAvailable: true,
    hasSetup: false,
    hasData: false,
    hasLegacyData: false,
  },
};

function setup({
  buildFlavor = 'traditional',
  withSecurity = true,
}: {
  buildFlavor?: RouteRegisterParameters['dependencies']['buildFlavor'];
  withSecurity?: boolean;
} = {}) {
  const router = httpServiceMock.createRouter();
  const getStatus = jest.fn().mockResolvedValue(schemasStatus);
  const getSpaceId = jest.fn().mockReturnValue('my-space');
  const security = { authz: {} };

  registerStatusRoute({
    router,
    logger: loggerMock.create(),
    services: { createProfilingEsClient: jest.fn() },
    dependencies: {
      start: {
        profilingDataAccess: { services: { getStatus } },
        security: withSecurity ? security : undefined,
      },
      setup: { spaces: { spacesService: { getSpaceId } } },
      buildFlavor,
    },
  } as unknown as RouteRegisterParameters);

  const routeEntry = router.get.mock.calls.find(([{ path }]) => path === getRoutePaths().Status);
  const handler = routeEntry?.[1] as (...args: unknown[]) => Promise<unknown>;

  const coreContext = coreMock.createRequestHandlerContext();
  const context = coreMock.createCustomRequestHandlerContext({ core: coreContext });
  const request = httpServerMock.createKibanaRequest();
  const response = httpServerMock.createResponseFactory();

  return {
    router,
    getStatus,
    security,
    coreContext,
    request,
    response,
    getProfilingStatus: () => handler(context, request, response),
  };
}

describe('registerStatusRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetHasSetupPrivileges.mockResolvedValue(true);
  });

  it('returns the profiling status with the setup privileges of the user', async () => {
    mockedGetHasSetupPrivileges.mockResolvedValue(false);
    const { getProfilingStatus, response, security, request } = setup();

    await getProfilingStatus();

    expect(mockedGetHasSetupPrivileges).toHaveBeenCalledWith({
      securityPluginStart: security,
      request,
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        ...schemasStatus,
        universalProfiling: { ...schemasStatus.universalProfiling, canSetup: false },
      },
    });
  });

  it('allows the setup when the security plugin is not available', async () => {
    const { getProfilingStatus, response } = setup({ withSecurity: false });

    await getProfilingStatus();

    expect(mockedGetHasSetupPrivileges).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        universalProfiling: expect.objectContaining({ canSetup: true }),
      }),
    });
  });

  it('does not allow the setup on serverless builds, without checking privileges', async () => {
    const { getProfilingStatus, response } = setup({ buildFlavor: 'serverless' });

    await getProfilingStatus();

    expect(mockedGetHasSetupPrivileges).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        universalProfiling: expect.objectContaining({ canSetup: false }),
      }),
    });
  });

  it('does not check the setup privileges once Universal Profiling is set up', async () => {
    const { getProfilingStatus, getStatus, response } = setup();
    const setUpStatus = {
      ...schemasStatus,
      universalProfiling: { ...schemasStatus.universalProfiling, hasSetup: true },
    };
    getStatus.mockResolvedValue(setUpStatus);

    await getProfilingStatus();

    expect(mockedGetHasSetupPrivileges).not.toHaveBeenCalled();
    // Serialize the body as the HTTP response would, which drops the undefined `canSetup`.
    const body = response.ok.mock.calls[0][0]?.body;
    expect(JSON.parse(JSON.stringify(body))).toStrictEqual(setUpStatus);
  });

  it('only reports that profiling is disabled, without the setup privileges', async () => {
    const { getProfilingStatus, getStatus, response } = setup();
    getStatus.mockResolvedValue({ isEnabled: false });

    await getProfilingStatus();

    expect(mockedGetHasSetupPrivileges).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalledWith({ body: { isEnabled: false } });
  });

  it('passes the request scoped clients, space and abort signal to the status service', async () => {
    const { getProfilingStatus, getStatus, coreContext } = setup();

    await getProfilingStatus();

    expect(getStatus).toHaveBeenCalledWith({
      esClient: coreContext.elasticsearch.client,
      soClient: coreContext.savedObjects.client,
      spaceId: 'my-space',
      abortSignal: expect.any(AbortSignal),
    });
  });

  it('handles errors from the status service', async () => {
    const { getProfilingStatus, getStatus, response } = setup();
    getStatus.mockRejectedValue(new Error('status failed'));

    await getProfilingStatus();

    expect(response.ok).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'Error while checking the profiling status',
        attributes: { cause: 'status failed', name: 'Error' },
      },
    });
  });
});
