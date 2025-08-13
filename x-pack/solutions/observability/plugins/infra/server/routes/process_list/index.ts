/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/pipeable';
import { fold } from 'fp-ts/Either';
import { identity } from 'fp-ts/function';
import { schema } from '@kbn/config-schema';
import { createRouteValidationFunction, throwErrors } from '@kbn/io-ts-utils';
import type { InfraBackendLibs } from '../../lib/infra_types';
import { createSearchClient } from '../../lib/create_search_client';
import { getInfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';
import { getProcessList } from '../../lib/host_details/process_list';
import { getProcessListChart } from '../../lib/host_details/process_list_chart';
import {
  ProcessListAPIRequestRT,
  ProcessListAPIResponseRT,
  ProcessListAPIChartRequestRT,
  ProcessListAPIChartResponseRT,
} from '../../../common/http_api';

const escapeHatch = schema.object({}, { unknowns: 'allow' });

export const initProcessListRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;
  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/process_list',
      validate: {
        body: createRouteValidationFunction(ProcessListAPIRequestRT),
      },
    },
    async (context, request, response) => {
      const options = pipe(
        ProcessListAPIRequestRT.decode(request.body),
        fold(throwErrors(Boom.badRequest), identity)
      );

      const infraMetricsClient = await getInfraMetricsClient({  request, libs, context });

      const client = createSearchClient(context, framework);
      const soClient = (await context.core).savedObjects.client;

      const { configuration } = await libs.sources.getSourceConfiguration(
        soClient,
        options.sourceId
      );

      const processListResponse = await getProcessList(infraMetricsClient,  options);

      return response.ok({
        body: ProcessListAPIResponseRT.encode(processListResponse),
      });
    }
  );

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/process_list/chart',
      validate: {
        body: escapeHatch,
      },
    },
    async (requestContext, request, response) => {
      const options = pipe(
        ProcessListAPIChartRequestRT.decode(request.body),
        fold(throwErrors(Boom.badRequest), identity)
      );

      const client = createSearchClient(requestContext, framework);
      const processListResponse = await getProcessListChart(client, options);

      return response.ok({
        body: ProcessListAPIChartResponseRT.encode(processListResponse),
      });
    }
  );
};
