/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { callEnterpriseSearchConfigAPI } from '../../lib/enterprise_search_config_api';
import { RouteDependencies } from '../../plugin';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';

const errorMessage = i18n.translate(
  'xpack.enterpriseSearch.server.routes.configData.errorMessage',
  {
    defaultMessage: 'Error fetching data from Enterprise Search',
  }
);

export function registerConfigDataRoute({
  router,
  config,
  log,
  globalConfigService,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/enterprise_search/config_data',
      validate: false,
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const data = await callEnterpriseSearchConfigAPI({ config, log, request });

      if ('responseStatus' in data) {
        return response.customError({
          body: errorMessage,
          statusCode: data.responseStatus,
        });
      } else if (!Object.keys(data).length) {
        return response.customError({
          body: errorMessage,
          statusCode: 502,
        });
      } else {
        return response.ok({
          body: data,
          headers: { 'content-type': 'application/json' },
        });
      }
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/es_config',
      validate: false,
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      return response.ok({
        body: { elasticsearch_host: globalConfigService.elasticsearchUrl },
        headers: { 'content-type': 'application/json' },
      });
    })
  );
}
