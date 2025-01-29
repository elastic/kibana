/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { KibanaResponseFactory } from '@kbn/core-http-server';
import { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import { i18n } from '@kbn/i18n';

import { AnalyticsEventsExist } from '../../../common/types/analytics';
import { ErrorCode } from '../../../common/types/error_codes';
import { addAnalyticsCollection } from '../../lib/analytics/add_analytics_collection';
import { analyticsEventsExist } from '../../lib/analytics/analytics_events_exist';
import { createApiKey } from '../../lib/analytics/create_api_key';
import { deleteAnalyticsCollectionById } from '../../lib/analytics/delete_analytics_collection';
import { fetchAnalyticsCollections } from '../../lib/analytics/fetch_analytics_collection';
import type { RouteDependencies } from '../../types';
import { createError } from '../../utils/create_error';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';

const createIndexNotFoundError = (error: Error, response: KibanaResponseFactory) => {
  return createError({
    errorCode: error.message as ErrorCode,
    message: i18n.translate(
      'xpack.enterpriseSearch.server.routes.addAnalyticsCollection.analyticsCollectionNotFoundErrorMessage',
      {
        defaultMessage: 'Analytics collection not found',
      }
    ),
    response,
    statusCode: 404,
  });
};

interface AnalyticsRouteDependencies extends RouteDependencies {
  data: DataPluginStart;
  savedObjects: SavedObjectsServiceStart;
}

export function registerAnalyticsRoutes({
  router,
  log,
  data,
  savedObjects,
}: AnalyticsRouteDependencies) {
  router.get(
    {
      path: '/internal/elasticsearch/analytics/collections',
      validate: {
        query: schema.object({
          query: schema.maybe(schema.string()),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        const query = request.query.query && request.query.query + '*';
        const collections = await fetchAnalyticsCollections(client, query);
        return response.ok({ body: collections });
      } catch (error) {
        if ((error as Error).message === ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND) {
          return response.ok({ body: [] });
        }

        throw error;
      }
    })
  );

  router.get(
    {
      path: '/internal/elasticsearch/analytics/collections/{name}',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      try {
        const collections = await fetchAnalyticsCollections(client, request.params.name);

        return response.ok({ body: collections[0] });
      } catch (error) {
        if ((error as Error).message === ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND) {
          return createIndexNotFoundError(error, response);
        }

        throw error;
      }
    })
  );

  router.post(
    {
      path: '/internal/elasticsearch/analytics/collections/{name}/api_key',
      validate: {
        body: schema.object({
          keyName: schema.string(),
        }),
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const collectionName = decodeURIComponent(request.params.name);
      const { keyName } = request.body;
      const { client } = (await context.core).elasticsearch;

      const apiKey = await createApiKey(client, collectionName, keyName);

      return response.ok({
        body: { apiKey },
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.post(
    {
      path: '/internal/elasticsearch/analytics/collections',
      validate: {
        body: schema.object({
          name: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client: elasticsearchClient } = (await context.core).elasticsearch;

      const dataViewsService = await data.indexPatterns.dataViewsServiceFactory(
        savedObjects.getScopedClient(request),
        elasticsearchClient.asCurrentUser,
        request
      );

      try {
        const body = await addAnalyticsCollection(
          elasticsearchClient,
          dataViewsService,
          request.body.name
        );
        return response.ok({ body });
      } catch (error) {
        if ((error as Error).message === ErrorCode.ANALYTICS_COLLECTION_ALREADY_EXISTS) {
          return createError({
            errorCode: (error as Error).message as ErrorCode,
            message: i18n.translate(
              'xpack.enterpriseSearch.server.routes.addAnalyticsCollection.analyticsCollectionExistsError',
              {
                defaultMessage: 'Collection name already exists. Choose another name.',
              }
            ),
            response,
            statusCode: 409,
          });
        }

        throw error;
      }
    })
  );

  router.delete(
    {
      path: '/internal/elasticsearch/analytics/collections/{name}',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        await deleteAnalyticsCollectionById(client, request.params.name);
        return response.ok();
      } catch (error) {
        if ((error as Error).message === ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND) {
          return createIndexNotFoundError(error, response);
        }
        throw error;
      }
    })
  );

  router.get(
    {
      path: '/internal/elasticsearch/analytics/collection/{name}/events/exist',
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      const eventsIndexExists = await analyticsEventsExist(client, request.params.name);

      const body: AnalyticsEventsExist = { exists: eventsIndexExists };

      return response.ok({ body });
    })
  );
}
