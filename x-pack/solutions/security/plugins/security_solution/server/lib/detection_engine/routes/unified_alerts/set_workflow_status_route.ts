/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';
import { ALERTS_API_READ } from '@kbn/security-solution-features/constants';

import { SetUnifiedAlertsWorkflowStatusRequestBody } from '../../../../../common/api/detection_engine/unified_alerts';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL } from '../../../../../common/constants';
import { setWorkflowStatusHandler } from '../common/set_workflow_status_handler';

export const setUnifiedAlertsWorkflowStatusRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataClient: IRuleDataClient | null
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [ALERTS_API_READ],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SetUnifiedAlertsWorkflowStatusRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const getIndexPattern = async () => {
          const spaceId = (await context.securitySolution).getSpaceId();
          const alertsIndex = ruleDataClient?.indexNameWithNamespace(spaceId);
          const indexPattern = [
            ...(alertsIndex ? [alertsIndex] : []), // Detection alerts
            `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`, // Attack alerts
          ];
          return indexPattern;
        };

        return setWorkflowStatusHandler({ context, request, response, getIndexPattern });
      }
    );
};
