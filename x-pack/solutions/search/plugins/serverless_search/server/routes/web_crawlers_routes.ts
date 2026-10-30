/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { KibanaResponseFactory, RequestHandlerContext } from '@kbn/core/server';
import type { RouteDependencies } from '../plugin';
import { errorHandler } from '../utils/error_handler';
import { WEB_CRAWLERS_API_PATH } from '../../common/types/web_crawlers';
import { WebCrawlersService } from '../lib/web_crawlers/web_crawlers_service';
import { WebCrawlerError } from '../lib/web_crawlers/errors';

const NOT_AVAILABLE_MESSAGE = 'Elastic managed web crawlers are not available in this project';
const FORBIDDEN_MESSAGE = 'Managing web crawlers requires the manage cluster privilege';

const crawlerConfigSchema = schema.object({
  name: schema.string({ minLength: 1, maxLength: 256 }),
  output_index: schema.string({ minLength: 1, maxLength: 256 }),
  domains: schema.arrayOf(
    schema.object({
      url: schema.uri({ scheme: ['http', 'https'] }),
      seed_urls: schema.maybe(schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }))),
    }),
    { minSize: 1 }
  ),
  schedule: schema.maybe(schema.string({ maxLength: 128 })),
  max_crawl_depth: schema.maybe(schema.number({ min: 1, max: 100 })),
});

const idParamsSchema = schema.object({ id: schema.string({ maxLength: 512 }) });

export const registerWebCrawlersRoutes = ({
  logger,
  router,
  getFleet,
  getSecurity,
}: RouteDependencies) => {
  const getService = async (core: Awaited<RequestHandlerContext['core']>) => {
    const fleet = await getFleet();
    if (!fleet?.agentless.enabled) {
      return undefined;
    }
    return new WebCrawlersService(
      fleet,
      core.savedObjects.client,
      core.elasticsearch.client.asCurrentUser,
      logger
    );
  };

  // Errors raised by Fleet for rejected policies are named error classes carrying a user-facing
  // message (validation, agentless restrictions, missing package); they are reported as 400
  const errorResponse = (response: KibanaResponseFactory, error: unknown) => {
    if (error instanceof WebCrawlerError) {
      return response.customError({ statusCode: error.statusCode, body: error.message });
    }
    if (error instanceof Error && error.name !== 'Error' && error.message) {
      const statusCode = /notfound/i.test(error.name) ? 404 : 400;
      return response.customError({ statusCode, body: error.message });
    }
    throw error;
  };

  const canManageCluster = async (core: Awaited<RequestHandlerContext['core']>) => {
    const privileges = await core.elasticsearch.client.asCurrentUser.security.hasPrivileges({
      cluster: ['manage'],
    });
    return privileges.cluster.manage === true;
  };

  router.get(
    {
      path: WEB_CRAWLERS_API_PATH,
      validate: {},
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is checked against the Elasticsearch manage cluster privilege',
        },
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const core = await context.core;
      if (!(await canManageCluster(core))) {
        return response.forbidden({ body: FORBIDDEN_MESSAGE });
      }
      const service = await getService(core);
      const crawlers = service ? await service.list() : [];
      return response.ok({ body: { crawlers, agentlessEnabled: service !== undefined } });
    })
  );

  router.post(
    {
      path: WEB_CRAWLERS_API_PATH,
      validate: { body: crawlerConfigSchema },
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is checked against the Elasticsearch manage cluster privilege',
        },
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const core = await context.core;
      if (!(await canManageCluster(core))) {
        return response.forbidden({ body: FORBIDDEN_MESSAGE });
      }
      const service = await getService(core);
      if (!service) {
        return response.customError({ statusCode: 503, body: NOT_AVAILABLE_MESSAGE });
      }
      try {
        const crawler = await service.create(request.body);
        return response.ok({ body: { crawler } });
      } catch (error) {
        return errorResponse(response, error);
      }
    })
  );

  router.put(
    {
      path: `${WEB_CRAWLERS_API_PATH}/{id}`,
      validate: { params: idParamsSchema, body: crawlerConfigSchema },
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is checked against the Elasticsearch manage cluster privilege',
        },
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const core = await context.core;
      if (!(await canManageCluster(core))) {
        return response.forbidden({ body: FORBIDDEN_MESSAGE });
      }
      const service = await getService(core);
      if (!service) {
        return response.customError({ statusCode: 503, body: NOT_AVAILABLE_MESSAGE });
      }
      try {
        const crawler = await service.update(request.params.id, request.body);
        return response.ok({ body: { crawler } });
      } catch (error) {
        return errorResponse(response, error);
      }
    })
  );

  router.delete(
    {
      path: `${WEB_CRAWLERS_API_PATH}/{id}`,
      validate: { params: idParamsSchema },
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is checked against the Elasticsearch manage cluster privilege',
        },
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const core = await context.core;
      if (!(await canManageCluster(core))) {
        return response.forbidden({ body: FORBIDDEN_MESSAGE });
      }
      const service = await getService(core);
      if (!service) {
        return response.customError({ statusCode: 503, body: NOT_AVAILABLE_MESSAGE });
      }
      try {
        await service.delete(request.params.id);
      } catch (error) {
        return errorResponse(response, error);
      }
      return response.ok({ body: { deleted: true } });
    })
  );

  router.post(
    {
      path: `${WEB_CRAWLERS_API_PATH}/{id}/crawl`,
      validate: { params: idParamsSchema },
      security: {
        authz: {
          enabled: false,
          reason: 'Authorization is checked against the Elasticsearch manage cluster privilege',
        },
      },
    },
    errorHandler(logger)(async (context, request, response) => {
      const core = await context.core;
      if (!(await canManageCluster(core))) {
        return response.forbidden({ body: FORBIDDEN_MESSAGE });
      }
      const service = await getService(core);
      if (!service) {
        return response.customError({ statusCode: 503, body: NOT_AVAILABLE_MESSAGE });
      }
      const security = await getSecurity();
      const user = security.authc.getCurrentUser(request);
      try {
        const result = await service.startCrawl(request.params.id, user?.username);
        return response.ok({ body: result });
      } catch (error) {
        return errorResponse(response, error);
      }
    })
  );
};
