import {RouteDependencies} from "@kbn/enterprise-search-plugin/server/plugin";
import {schema} from "@kbn/config-schema";
import {elasticsearchErrorHandler} from "@kbn/enterprise-search-plugin/server/utils/elasticsearch_error_handler";
import {deleteConnectorById} from "@kbn/search-connectors";

export function registerDeprecationRoutes({ router, log }: RouteDependencies) {
  router.post(
    {
      path: '/internal/enterprise_search/deprecations/delete_crawler_connectors',
      validate: {
        body: schema.object({
          ids: schema.arrayOf(schema.string())
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      log.info("Made it here, and ids are: "+request.body.ids)
      const {client} = (await context.core).elasticsearch;
      for (const connector_id of request.body.ids) {
        await deleteConnectorById(client.asInternalUser, connector_id)
      }
      return response.ok();
    })
  );
}
