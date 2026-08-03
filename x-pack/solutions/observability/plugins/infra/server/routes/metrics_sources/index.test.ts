/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { InfraBackendLibs } from '../../lib/infra_types';
import type { InfraPluginRequestHandlerContext } from '../../types';
import { initMetricsSourceConfigurationRoutes } from '.';

const createRouteTestHarness = () => {
  const registerRoute = jest.fn();
  const callWithRequest = jest.fn();
  const getSourceConfiguration = jest.fn().mockResolvedValue({
    id: 'default',
    origin: 'internal',
    configuration: {
      name: 'Default',
      description: '',
      metricAlias: 'metrics-*',
      inventoryDefaultView: '0',
      metricsExplorerDefaultView: '0',
      anomalyThreshold: 50,
    },
  });
  const hasMetricIndices = jest.fn().mockResolvedValue(true);
  const libs = {
    framework: {
      callWithRequest,
      registerRoute,
      router: {
        handleLegacyErrors: (handler: unknown) => handler,
      },
    },
    logger: {
      error: jest.fn(),
    },
    sources: {
      getSourceConfiguration,
    },
    sourceStatus: {
      hasMetricIndices,
    },
  } as unknown as InfraBackendLibs;
  initMetricsSourceConfigurationRoutes(libs);

  return {
    callWithRequest,
    hasMetricIndices,
    registerRoute,
  };
};

const getRouteHandler = (registerRoute: jest.Mock, method: string, path: string) => {
  const routeRegistration = registerRoute.mock.calls.find(
    ([config]) => config.method === method && config.path === path
  );
  if (!routeRegistration) {
    throw new Error(`Route not registered: ${method} ${path}`);
  }
  return routeRegistration[1];
};

describe('metrics source configuration routes', () => {
  it('passes the request to the metrics index status check', async () => {
    const { hasMetricIndices, registerRoute } = createRouteTestHarness();
    const handler = getRouteHandler(registerRoute, 'get', '/api/metrics/source/{sourceId}');

    const request = httpServerMock.createKibanaRequest({
      params: { sourceId: 'default' },
      headers: { 'x-project-routing': '_alias:*' },
    });
    const context = {
      core: Promise.resolve({
        savedObjects: { client: {} },
      }),
    } as unknown as InfraPluginRequestHandlerContext;
    const response = httpServerMock.createResponseFactory();

    await handler(context, request, response);

    expect(hasMetricIndices).toHaveBeenCalledWith(context, 'default', request);
    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          source: expect.objectContaining({
            status: {
              metricIndicesExist: true,
              remoteClustersExist: true,
            },
          }),
        }),
      })
    );
  });

  it('passes the request through schema metadata searches', async () => {
    const { callWithRequest, registerRoute } = createRouteTestHarness();
    callWithRequest.mockResolvedValue({
      responses: [{ hits: { total: { value: 0 } } }, { hits: { total: { value: 1 } } }],
    });
    const handler = getRouteHandler(
      registerRoute,
      'get',
      '/api/metrics/source/time_range_metadata'
    );
    const request = httpServerMock.createKibanaRequest({
      query: {
        dataSource: 'host',
        from: 0,
        isInventoryView: false,
        to: 100,
      },
      headers: { 'x-project-routing': '_alias:*' },
    });
    const context = {
      core: Promise.resolve({
        uiSettings: {
          client: {
            get: jest.fn().mockResolvedValue([]),
          },
        },
      }),
      infra: Promise.resolve({
        getMetricsIndices: jest.fn().mockResolvedValue(['metrics-*']),
      }),
    } as unknown as InfraPluginRequestHandlerContext;
    const response = httpServerMock.createResponseFactory();

    await handler(context, request, response);

    expect(callWithRequest).toHaveBeenCalledWith(context, 'msearch', expect.any(Object), request);
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        preferredSchema: 'semconv',
        schemas: ['semconv'],
      },
    });
  });

  it('passes the request through source has-data searches', async () => {
    const { callWithRequest, registerRoute } = createRouteTestHarness();
    callWithRequest.mockResolvedValue({
      hits: { total: { value: 1 } },
    });
    const handler = getRouteHandler(registerRoute, 'get', '/api/metrics/source/{sourceId}/hasData');
    const request = httpServerMock.createKibanaRequest({
      params: { sourceId: 'default' },
      headers: { 'x-project-routing': '_alias:*' },
    });
    const context = {
      core: Promise.resolve({
        savedObjects: { client: {} },
        uiSettings: {
          client: {
            get: jest.fn().mockResolvedValue([]),
          },
        },
      }),
    } as unknown as InfraPluginRequestHandlerContext;
    const response = httpServerMock.createResponseFactory();

    await handler(context, request, response);

    expect(callWithRequest).toHaveBeenCalledWith(context, 'search', expect.any(Object), request);
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        configuration: expect.objectContaining({ metricAlias: 'metrics-*' }),
        hasData: true,
      },
    });
  });
});
