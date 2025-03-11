/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaPackageJson } from '@kbn/repo-info';

import type { RouteDependencies } from '../../types';
import { isAgentlessEnabled } from '../../utils/agentless';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';

export function registerConfigDataRoute({
  router,
  config,
  log,
  globalConfigService,
  getStartServices,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/enterprise_search/config_data',
      validate: false,
    },
    elasticsearchErrorHandler(log, async (context, _request, response) => {
      const [_core, start] = await getStartServices();
      const data = {
        features: {
          hasConnectors: config.hasConnectors,
          hasDefaultIngestPipeline: config.hasDefaultIngestPipeline,
          hasDocumentLevelSecurityEnabled: config.hasDocumentLevelSecurityEnabled,
          hasIncrementalSyncEnabled: config.hasIncrementalSyncEnabled,
          hasNativeConnectors: isAgentlessEnabled(start),
          // 9.x Does not have ent search node, and therefore does not have support for the following
          hasWebCrawler: false,
        },
        kibanaVersion: kibanaPackageJson.version,
      };

      return response.ok({
        body: data,
        headers: { 'content-type': 'application/json' },
      });
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
