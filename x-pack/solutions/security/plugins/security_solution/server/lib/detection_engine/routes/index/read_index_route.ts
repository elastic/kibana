/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { RuleDataPluginService } from '@kbn/rule-registry-plugin/server';
import type { IKibanaResponse } from '@kbn/core/server';
import { INITIALIZE_SECURITY_SOLUTION } from '@kbn/security-solution-features/constants';
import type { ReadAlertsIndexResponse } from '../../../../../common/api/detection_engine/index_management';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_INDEX_URL } from '../../../../../common/constants';

import { buildSiemResponse } from '../utils';

export const readIndexRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataService: RuleDataPluginService
) => {
  router.versioned
    .get({
      path: DETECTION_ENGINE_INDEX_URL,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [INITIALIZE_SECURITY_SOLUTION],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
      },
      async (context, _, response): Promise<IKibanaResponse<ReadAlertsIndexResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const securitySolution = await context.securitySolution;

          const spaceId = securitySolution.getSpaceId();
          const indexName = ruleDataService.getResourceName(`security.alerts-${spaceId}`);

          return response.ok({
            body: {
              name: indexName,
              index_mapping_outdated: false,
            },
          });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
