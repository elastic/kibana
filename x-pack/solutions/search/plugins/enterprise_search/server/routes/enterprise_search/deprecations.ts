/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { deleteConnectorById, putUpdateNative } from '@kbn/search-connectors';

import { setPreEightEnterpriseSearchIndicesReadOnly } from '../../deprecations/pre_eight_index_deprecator';
import { RouteDependencies } from '../../plugin';

import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';

export function registerDeprecationRoutes({ router, log }: RouteDependencies) {
  router.post(
    {
      path: '/internal/enterprise_search/deprecations/delete_crawler_connectors',
      validate: {
        body: schema.object({
          ids: schema.arrayOf(schema.string()),
          deprecationDetails: schema.object({ domainId: schema.literal('enterpriseSearch') }),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      await Promise.all(
        request.body.ids.map((connectorId) =>
          deleteConnectorById(client.asCurrentUser, connectorId)
        )
      );
      return response.ok({
        body: { deleted: request.body.ids },
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/deprecations/convert_connectors_to_client',
      validate: {
        body: schema.object({
          ids: schema.arrayOf(schema.string()),
          deprecationDetails: schema.object({ domainId: schema.literal('enterpriseSearch') }),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      await Promise.all(
        request.body.ids.map((connectorId) =>
          putUpdateNative(client.asCurrentUser, connectorId, false)
        )
      );
      return response.ok({
        body: { converted_to_client: request.body.ids },
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/deprecations/set_enterprise_search_indices_read_only',
      validate: {
        body: schema.object({
          deprecationDetails: schema.object({ domainId: schema.literal('enterpriseSearch') }),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const setResponse = await setPreEightEnterpriseSearchIndicesReadOnly(client.asCurrentUser);
      if (setResponse.length > 0) {
        return response.badRequest({
          body: { message: setResponse },
          headers: { 'content-type': 'application/json' },
        });
      }
      return response.ok({
        body: { acknowedged: true },
        headers: { 'content-type': 'application/json' },
      });
    })
  );
}
