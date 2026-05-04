/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { GET_SIEM_READINESS_PIPELINES_API_PATH } from '../../../../common/api/siem_readiness/constants';
import { API_VERSIONS } from '../../../../common/constants';
import type { SiemReadinessRoutesDeps } from '../types';
import { fetchPipelines } from '../fetch_pipelines';

export const getReadinessPipelinesRoute = (
  router: SiemReadinessRoutesDeps['router'],
  logger: SiemReadinessRoutesDeps['logger'],
  isServerless: boolean
) => {
  router.versioned
    .get({
      path: GET_SIEM_READINESS_PIPELINES_API_PATH,
      access: 'public',
      security: { authz: { requiredPrivileges: ['securitySolution'] } },
    })
    .addVersion({ version: API_VERSIONS.public.v1, validate: {} }, async (context, _, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { elasticsearch } = await context.core;
        const pipelines = await fetchPipelines(elasticsearch.client.asCurrentUser, isServerless);

        logger.info(
          `Retrieved ${pipelines.length} ingest pipelines${
            isServerless ? ' (serverless mode)' : ''
          }`
        );
        return response.ok({ body: pipelines });
      } catch (e) {
        const error = transformError(e);
        logger.error(`Error retrieving SIEM readiness pipelines: ${error.message}`);
        return siemResponse.error({ statusCode: error.statusCode, body: error.message });
      }
    });
};
