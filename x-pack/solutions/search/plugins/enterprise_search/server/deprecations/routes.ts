import {RouteDependencies} from "@kbn/enterprise-search-plugin/server/plugin";
import {schema} from "@kbn/config-schema";
import {elasticsearchErrorHandler} from "@kbn/enterprise-search-plugin/server/utils/elasticsearch_error_handler";
import {deleteConnectorById, putUpdateNative} from "@kbn/search-connectors";

export function registerDeprecationRoutes({ router, log }: RouteDependencies) {
  router.post(
    {
      path: '/internal/enterprise_search/deprecations/delete_crawler_connectors',
      validate: {
        body: schema.object({
          ids: schema.arrayOf(schema.string()),
          deprecationDetails: schema.object({ domainId: schema.literal('enterpriseSearch')}),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const {client} = (await context.core).elasticsearch;
      for (const connectorId of request.body.ids) {
        await deleteConnectorById(client.asCurrentUser, connectorId)
      }
      return response.ok({ body: { deleted: request.body.ids }});
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/deprecations/convert_connectors_to_client',
      validate: {
        body: schema.object({
          ids: schema.arrayOf(schema.string()),
          deprecationDetails: schema.object({ domainId: schema.literal('enterpriseSearch')}),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const {client} = (await context.core).elasticsearch;
      for (const connectorId of request.body.ids) {
        await putUpdateNative(client.asCurrentUser, connectorId, false)
      }
      return response.ok({ body: { converted_to_client: request.body.ids }});
    })
  );
}
