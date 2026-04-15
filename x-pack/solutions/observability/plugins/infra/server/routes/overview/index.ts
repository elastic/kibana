/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import { TopNodesRequestRT } from '../../../common/http_api/overview_api';
import type { InfraBackendLibs } from '../../lib/infra_types';
import { createSearchClient } from '../../lib/create_search_client';
import { getInfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';
import { getPreferredSchema } from '../../lib/helpers/get_preferred_schema';
import { queryTopNodes } from './lib/get_top_nodes';

export const initOverviewRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/overview/top',
      validate: {
        body: createRouteValidationFunction(TopNodesRequestRT),
      },
    },
    async (requestContext, request, response) => {
      const options = request.body;
      const client = createSearchClient(requestContext, framework);
      const soClient = (await requestContext.core).savedObjects.client;
      const source = await libs.sources.getSourceConfiguration(soClient, options.sourceId);

      const infraMetricsClient = await getInfraMetricsClient({
        request,
        libs,
        context: requestContext,
      });

      const { schemas } = await getPreferredSchema({
        infraMetricsClient,
        dataSource: 'host',
        from: options.timerange.from,
        to: options.timerange.to,
      });

      const activeSchemas = schemas.length > 0 ? schemas : ['ecs' as const];

      const topNResponse = await queryTopNodes(options, client, source, activeSchemas);

      return response.ok({
        body: topNResponse,
      });
    }
  );
};
