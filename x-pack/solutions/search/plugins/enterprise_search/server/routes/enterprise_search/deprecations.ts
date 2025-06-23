/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { deleteConnectorById, putUpdateNative } from '@kbn/search-connectors';

import { getEnterpriseSearchAccountCleanupAccounts } from '../../deprecations';
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
      path: '/internal/enterprise_search/deprecations/clean_ent_search_accounts',
      validate: {
        body: schema.object({
          deprecationDetails: schema.object({ domainId: schema.literal('enterpriseSearch') }),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const esClient = client.asCurrentUser;

      const { esUser, credentialTokenIds, esCloudApiKeys } =
        await getEnterpriseSearchAccountCleanupAccounts(esClient);

      if (!esUser && credentialTokenIds.length === 0 && esCloudApiKeys.length === 0) {
        // nothing to delete or invalidate - just return success
        return response.ok({
          body: { success: true },
          headers: { 'content-type': 'application/json' },
        });
      }

      if (esUser && esUser.enterprise_search) {
        await esClient.security.deleteUser({ username: esUser.enterprise_search.username });
      }

      for (const tokenId of credentialTokenIds) {
        await esClient.security.deleteServiceToken({
          namespace: 'elastic',
          service: 'enterprise-search-server',
          name: tokenId,
        });
      }

      for (const apiKey of esCloudApiKeys) {
        await esClient.security.invalidateApiKey({ id: apiKey });
      }

      return response.ok({
        body: { success: true },
        headers: { 'content-type': 'application/json' },
      });
    })
  );
}
