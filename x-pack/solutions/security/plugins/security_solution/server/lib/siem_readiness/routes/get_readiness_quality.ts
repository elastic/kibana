/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { GET_SIEM_READINESS_QUALITY_API_PATH } from '../../../../common/api/siem_readiness/constants';
import { API_VERSIONS } from '../../../../common/constants';
import type { SiemReadinessRoutesDeps } from '../types';
import { fetchQualityResults } from '../fetch_quality_results';
import { fetchCategories } from '../fetch_categories';
import { compileQualityData } from '../compile_quality';

export const getReadinessQualityRoute = (
  router: SiemReadinessRoutesDeps['router'],
  logger: SiemReadinessRoutesDeps['logger']
) => {
  router.versioned
    .get({
      path: GET_SIEM_READINESS_QUALITY_API_PATH,
      access: 'public',
      security: { authz: { requiredPrivileges: ['securitySolution'] } },
    })
    .addVersion({ version: API_VERSIONS.public.v1, validate: {} }, async (context, _, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { elasticsearch } = await context.core;
        const esClient = elasticsearch.client.asCurrentUser;

        const [resultsByIndex, categoriesData] = await Promise.all([
          fetchQualityResults(esClient),
          fetchCategories(esClient),
        ]);

        const compiledData = compileQualityData(resultsByIndex, categoriesData);

        logger.info(
          `Retrieved quality data for ${compiledData.summary.totalChecked} checked indices (${compiledData.summary.totalIncompatible} incompatible, ${compiledData.summary.totalUnchecked} unchecked)`
        );
        return response.ok({ body: compiledData });
      } catch (e) {
        const error = transformError(e);
        logger.error(`Error retrieving SIEM readiness quality data: ${error.message}`);
        return siemResponse.error({ statusCode: error.statusCode, body: error.message });
      }
    });
};
