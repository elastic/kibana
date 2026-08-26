/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  ALERTS_API_ALL,
  ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE,
} from '@kbn/security-solution-features/constants';
import type { Logger } from '@kbn/core/server';

import { SetUnifiedAlertsAssigneesRequestBody } from '../../../../../common/api/detection_engine/unified_alerts';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import { validateAlertAssigneesArrays } from '../common/validators/validate_alert_arrays';
import { updateAlertsAssignees } from '../common/operations/update_alerts_assignees';
import { getUnifiedAlertsIndex } from '../common/index_patterns/get_unified_alerts_index';
import { withSiemErrorHandling } from '../with_siem_error_handling';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';
import {
  MAX_ALERTS_PER_TRIGGER,
  MAX_ASSIGNEE_UID_LENGTH,
  MAX_ASSIGNEES_PER_OPERATION,
} from '../../../../../common/workflows/triggers';
import { fetchAlertIdToIndex } from '../common/operations/prefetch_previous_statuses';
import { isAttackDiscoveryIndex } from '../common/operations/is_attack_discovery_index';

export const setUnifiedAlertsAssigneesRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataClient: IRuleDataClient | null,
  logger: Logger,
  eventBus?: SecuritySolutionEventBus
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [
            { anyRequired: [ALERTS_API_ALL, ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE] },
          ],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SetUnifiedAlertsAssigneesRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const { ids, assignees } = request.body;

        const validationErrors = validateAlertAssigneesArrays(assignees);
        if (validationErrors.length) {
          return buildSiemResponse(response).error({ statusCode: 400, body: validationErrors });
        }

        const index = await getUnifiedAlertsIndex({ context, ruleDataClient });

        const alertIds: string[] = [];
        const attackIds: string[] = [];

        if (eventBus) {
          try {
            const esClient = (await context.core).elasticsearch.client.asCurrentUser;
            const idToIndex = await fetchAlertIdToIndex(esClient, index, ids);
            for (const id of ids) {
              const docIndex = idToIndex.get(id);
              if (docIndex != null) {
                if (isAttackDiscoveryIndex(docIndex)) {
                  attackIds.push(id);
                } else {
                  alertIds.push(id);
                }
              }
            }
          } catch {
            logger.warn('Failed to pre-fetch alert indices for workflow trigger (assignees)');
          }
        }

        return withSiemErrorHandling(response, async () => {
          const result = await updateAlertsAssignees({ context, index, ids, assignees });
          if (eventBus) {
            const validAssigneesToAdd = assignees.add
              .filter((uid) => uid.length <= MAX_ASSIGNEE_UID_LENGTH)
              .slice(0, MAX_ASSIGNEES_PER_OPERATION);
            const validAssigneesToRemove = assignees.remove
              .filter((uid) => uid.length <= MAX_ASSIGNEE_UID_LENGTH)
              .slice(0, MAX_ASSIGNEES_PER_OPERATION);
            const truncated = ids.length > MAX_ALERTS_PER_TRIGGER;
            if (attackIds.length > 0) {
              void eventBus.emitAttackAssigneesChanged(request, {
                attackIds: attackIds.slice(0, MAX_ALERTS_PER_TRIGGER),
                assigneesToAdd: validAssigneesToAdd,
                assigneesToRemove: validAssigneesToRemove,
                truncated,
              });
            }
            if (alertIds.length > 0) {
              void eventBus.emitAlertAssigneesChanged(request, {
                alertIds: alertIds.slice(0, MAX_ALERTS_PER_TRIGGER),
                assigneesToAdd: validAssigneesToAdd,
                assigneesToRemove: validAssigneesToRemove,
                truncated,
              });
            }
          }
          return result;
        });
      }
    );
};
