/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { RULES_API_ALL } from '@kbn/security-solution-features/constants';
import { PREBUILT_RULES_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS } from '../../constants';

// eslint-disable-next-line no-restricted-imports
import { legacyCreatePrepackagedRules } from './legacy_create_prepackaged_rules';

export const installPrebuiltRulesAndTimelinesRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .put({
      access: 'public',
      path: PREBUILT_RULES_URL,
      security: {
        authz: {
          requiredPrivileges: [RULES_API_ALL],
        },
      },
      options: {
        timeout: {
          idleSocket: PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS,
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
      },
      async (context, _, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const rulesClient = await (await context.alerting).getRulesClient();

          const validated = await legacyCreatePrepackagedRules(
            await context.securitySolution,
            rulesClient,
            logger,
            undefined
          );
          return response.ok({ body: validated ?? {} });
        } catch (err) {
          logger.error(`installPrebuiltRulesAndTimelinesRoute: Caught error:`, err);
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
