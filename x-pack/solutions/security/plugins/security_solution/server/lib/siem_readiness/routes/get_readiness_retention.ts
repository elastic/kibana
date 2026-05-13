/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { GET_SIEM_READINESS_RETENTION_API_PATH } from '../../../../common/api/siem_readiness/constants';
import { API_VERSIONS } from '../../../../common/constants';
import type { SiemReadinessRoutesDeps } from '../types';
import { fetchRetention } from '../fetch_retention';
import { fetchCategories } from '../fetch_categories';
import { compileRetentionData } from '../compile_retention';

export const getReadinessRetentionRoute = (
  router: SiemReadinessRoutesDeps['router'],
  logger: SiemReadinessRoutesDeps['logger'],
  isServerless: boolean
) => {
  router.versioned
    .get({
      path: GET_SIEM_READINESS_RETENTION_API_PATH,
      access: 'public',
      security: { authz: { requiredPrivileges: ['securitySolution'] } },
    })
    .addVersion({ version: API_VERSIONS.public.v1, validate: {} }, async (context, _, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { elasticsearch } = await context.core;
        const esClient = elasticsearch.client.asCurrentUser;

        const [items, categoriesData] = await Promise.all([
          fetchRetention(esClient, isServerless),
          fetchCategories(esClient),
        ]);

        const compiledData = compileRetentionData(items, categoriesData, isServerless);

        logger.info(
          `Retrieved retention data for ${compiledData.summary.totalIndices} indices (${
            compiledData.summary.nonCompliantCount
          } non-compliant)${isServerless ? ' (serverless mode)' : ''}`
        );
        return response.ok({ body: compiledData });
      } catch (e) {
        const error = transformError(e);
        logger.error(`Error retrieving SIEM readiness retention data: ${error.message}`);
        return siemResponse.error({ statusCode: error.statusCode, body: error.message });
      }
    });
};
