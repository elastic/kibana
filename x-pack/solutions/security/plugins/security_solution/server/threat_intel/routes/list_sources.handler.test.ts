/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { registerListSourcesRoute, registerUpdateSourceRoute } from './list_sources';
import {
  LIST_SOURCES_API_PATH,
  SOURCE_BY_ID_API_PATH,
} from '../../../common/threat_intel';
import { THREAT_INTEL_READ_AUTHZ, THREAT_INTEL_WRITE_AUTHZ } from './lib/authz';

/**
 * Handler-level tests for the list/update sources routes. Verifies what a
 * unit test on the extracted `*ForTest` helpers cannot: that the route
 * actually applies its declared `security.authz`, gates on bootstrap, and
 * returns the right status/shape for the success and failure paths.
 */
describe('list_sources routes', () => {
  const logger = loggingSystemMock.createLogger();

  const buildDeps = (overrides: { getBootstrapReady?: () => Promise<void> } = {}) => {
    const router = httpServiceMock.createRouter();
    const getSpacesService = jest.fn().mockReturnValue(undefined);
    const getBootstrapReady = overrides.getBootstrapReady ?? jest.fn().mockResolvedValue(undefined);
    return { router, getSpacesService, getBootstrapReady };
  };

  const getRegisteredVersion = (
    router: ReturnType<typeof httpServiceMock.createRouter>,
    method: 'post' | 'patch',
    path: string
  ) => {
    const route = router.versioned.getRoute(method, path);
    return Object.values(route.versions)[0];
  };

  describe('registerListSourcesRoute', () => {
    it('declares the read authz on the route config', () => {
      const { router, getSpacesService, getBootstrapReady } = buildDeps();
      registerListSourcesRoute({ router, logger, getSpacesService, getBootstrapReady } as never);

      const [routeConfig] = router.versioned.post.mock.calls[0];
      expect(routeConfig.security?.authz).toBe(THREAT_INTEL_READ_AUTHZ);
    });

    it('returns 503 when bootstrap has not resolved', async () => {
      const { router, getSpacesService } = buildDeps({
        getBootstrapReady: jest.fn().mockRejectedValue(new Error('template install failed')),
      });
      registerListSourcesRoute({
        router,
        logger,
        getSpacesService,
        getBootstrapReady: jest.fn().mockRejectedValue(new Error('template install failed')),
      } as never);

      const version = getRegisteredVersion(router, 'post', LIST_SOURCES_API_PATH);
      const context = coreMock.createRequestHandlerContext();
      const request = httpServerMock.createKibanaRequest({ body: {} });
      const response = httpServerMock.createResponseFactory();

      await version.handler({ core: Promise.resolve(context) } as never, request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 503 })
      );
    });

    it('returns 200 with the approved-catalog sources on success', async () => {
      const { router, getSpacesService, getBootstrapReady } = buildDeps();
      registerListSourcesRoute({ router, logger, getSpacesService, getBootstrapReady } as never);

      const version = getRegisteredVersion(router, 'post', LIST_SOURCES_API_PATH);
      const context = coreMock.createRequestHandlerContext();
      const esClient = context.elasticsearch.client.asInternalUser;
      (esClient.indices.getAlias as jest.Mock).mockResolvedValue({});
      (esClient.indices.putAlias as jest.Mock).mockResolvedValue({});
      (esClient.search as jest.Mock).mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'vendor_api:elastic-security-labs',
              _source: { name: 'Elastic Security Labs', adapter_type: 'vendor_api', enabled: true },
            },
          ],
        },
      });

      const request = httpServerMock.createKibanaRequest({ body: {} });
      const response = httpServerMock.createResponseFactory();

      await version.handler({ core: Promise.resolve(context) } as never, request, response);

      expect(response.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            total: 1,
            sources: expect.arrayContaining([
              expect.objectContaining({ source_id: 'vendor_api:elastic-security-labs' }),
            ]),
          }),
        })
      );
    });

    it('returns 500 when the sources search fails', async () => {
      const { router, getSpacesService, getBootstrapReady } = buildDeps();
      registerListSourcesRoute({ router, logger, getSpacesService, getBootstrapReady } as never);

      const version = getRegisteredVersion(router, 'post', LIST_SOURCES_API_PATH);
      const context = coreMock.createRequestHandlerContext();
      const esClient = context.elasticsearch.client.asInternalUser;
      (esClient.indices.getAlias as jest.Mock).mockResolvedValue({});
      (esClient.indices.putAlias as jest.Mock).mockResolvedValue({});
      (esClient.search as jest.Mock).mockRejectedValue(new Error('cluster unavailable'));

      const request = httpServerMock.createKibanaRequest({ body: {} });
      const response = httpServerMock.createResponseFactory();

      await version.handler({ core: Promise.resolve(context) } as never, request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
    });
  });

  describe('registerUpdateSourceRoute', () => {
    it('declares the write authz on the route config', () => {
      const { router, getSpacesService, getBootstrapReady } = buildDeps();
      registerUpdateSourceRoute({ router, logger, getSpacesService, getBootstrapReady } as never);

      const [routeConfig] = router.versioned.patch.mock.calls[0];
      expect(routeConfig.security?.authz).toBe(THREAT_INTEL_WRITE_AUTHZ);
    });

    it('returns 503 when bootstrap has not resolved', async () => {
      const { router, getSpacesService } = buildDeps();
      registerUpdateSourceRoute({
        router,
        logger,
        getSpacesService,
        getBootstrapReady: jest.fn().mockRejectedValue(new Error('template install failed')),
      } as never);

      const version = getRegisteredVersion(router, 'patch', SOURCE_BY_ID_API_PATH);
      const context = coreMock.createRequestHandlerContext();
      const request = httpServerMock.createKibanaRequest({
        params: { sourceId: 'vendor_api:elastic-security-labs' },
        body: { enabled: false },
      });
      const response = httpServerMock.createResponseFactory();

      await version.handler({ core: Promise.resolve(context) } as never, request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 503 })
      );
    });

    it('returns 200 when the source is approved and update succeeds', async () => {
      const { router, getSpacesService, getBootstrapReady } = buildDeps();
      registerUpdateSourceRoute({ router, logger, getSpacesService, getBootstrapReady } as never);

      const version = getRegisteredVersion(router, 'patch', SOURCE_BY_ID_API_PATH);
      const context = coreMock.createRequestHandlerContext();
      const esClient = context.elasticsearch.client.asInternalUser;
      (esClient.get as jest.Mock).mockResolvedValue({
        _source: { name: 'Elastic Security Labs', adapter_type: 'vendor_api' },
      });
      (esClient.update as jest.Mock).mockResolvedValue({});

      const request = httpServerMock.createKibanaRequest({
        params: { sourceId: 'vendor_api:elastic-security-labs' },
        body: { enabled: false },
      });
      const response = httpServerMock.createResponseFactory();

      await version.handler({ core: Promise.resolve(context) } as never, request, response);

      expect(response.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { source_id: 'vendor_api:elastic-security-labs', updated: true },
        })
      );
    });

    it('returns 404 when the source id is not in the approved catalog', async () => {
      const { router, getSpacesService, getBootstrapReady } = buildDeps();
      registerUpdateSourceRoute({ router, logger, getSpacesService, getBootstrapReady } as never);

      const version = getRegisteredVersion(router, 'patch', SOURCE_BY_ID_API_PATH);
      const context = coreMock.createRequestHandlerContext();
      const request = httpServerMock.createKibanaRequest({
        params: { sourceId: 'rss:not-approved' },
        body: { enabled: false },
      });
      const response = httpServerMock.createResponseFactory();

      await version.handler({ core: Promise.resolve(context) } as never, request, response);

      expect(response.notFound).toHaveBeenCalled();
    });

    it('returns 500 when the update write fails', async () => {
      const { router, getSpacesService, getBootstrapReady } = buildDeps();
      registerUpdateSourceRoute({ router, logger, getSpacesService, getBootstrapReady } as never);

      const version = getRegisteredVersion(router, 'patch', SOURCE_BY_ID_API_PATH);
      const context = coreMock.createRequestHandlerContext();
      const esClient = context.elasticsearch.client.asInternalUser;
      (esClient.get as jest.Mock).mockResolvedValue({
        _source: { name: 'Elastic Security Labs', adapter_type: 'vendor_api' },
      });
      (esClient.update as jest.Mock).mockRejectedValue(new Error('write conflict'));

      const request = httpServerMock.createKibanaRequest({
        params: { sourceId: 'vendor_api:elastic-security-labs' },
        body: { enabled: false },
      });
      const response = httpServerMock.createResponseFactory();

      await version.handler({ core: Promise.resolve(context) } as never, request, response);

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 })
      );
    });
  });
});
