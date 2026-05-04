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
        const items = await fetchRetention(elasticsearch.client.asCurrentUser, isServerless);

        logger.info(
          `Retrieved retention data for ${items.filter((i) => i.isDataStream).length} data streams${
            isServerless
              ? ' (serverless mode)'
              : ` and ${items.filter((i) => !i.isDataStream).length} standalone indices`
          }`
        );
        return response.ok({ body: { items } });
      } catch (e) {
        const error = transformError(e);
        logger.error(`Error retrieving SIEM readiness retention data: ${error.message}`);
        return siemResponse.error({ statusCode: error.statusCode, body: error.message });
      }
    });
};
