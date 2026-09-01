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
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';

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
import {
  fetchAllAlertIdIndexWithSource,
  collectChangedIdsByFamily,
} from '../common/operations/prefetch_previous_statuses';

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

        let alertIds: string[] = [];
        let attackIds: string[] = [];

        // All length-valid UIDs — used for no-op detection so that UIDs beyond the payload cap
        // still trigger an emit when they would actually change a document.
        const allValidAssigneesToAdd = assignees.add.filter(
          (uid) => uid.length <= MAX_ASSIGNEE_UID_LENGTH
        );
        const allValidAssigneesToRemove = assignees.remove.filter(
          (uid) => uid.length <= MAX_ASSIGNEE_UID_LENGTH
        );
        // Payload arrays are capped to MAX_ASSIGNEES_PER_OPERATION; when the full arrays are
        // larger the mutation applied more than the event reports, so truncated is set below.
        const validAssigneesToAdd = allValidAssigneesToAdd.slice(0, MAX_ASSIGNEES_PER_OPERATION);
        const validAssigneesToRemove = allValidAssigneesToRemove.slice(
          0,
          MAX_ASSIGNEES_PER_OPERATION
        );
        const operationTruncated =
          allValidAssigneesToAdd.length > MAX_ASSIGNEES_PER_OPERATION ||
          allValidAssigneesToRemove.length > MAX_ASSIGNEES_PER_OPERATION;

        if (eventBus) {
          try {
            const esClient = (await context.core).elasticsearch.client.asCurrentUser;
            // The helper reserves one hit per index family in `index`, so an _id present
            // in several of them (detection alerts, scheduled and adhoc attack discovery)
            // is fully retrieved and cannot push another ID out of the result window.
            const hits = await fetchAllAlertIdIndexWithSource(esClient, index, ids, [
              ALERT_WORKFLOW_ASSIGNEE_IDS,
            ]);
            ({ alertIds, attackIds } = collectChangedIdsByFamily(hits, (source) => {
              const currentAssignees = new Set<string>(
                Array.isArray(source[ALERT_WORKFLOW_ASSIGNEE_IDS])
                  ? (source[ALERT_WORKFLOW_ASSIGNEE_IDS] as string[])
                  : []
              );
              // Use allValid* (not the capped arrays) so a UID beyond position 100 that would
              // actually change the document still triggers the event.
              return (
                allValidAssigneesToAdd.some((uid) => !currentAssignees.has(uid)) ||
                allValidAssigneesToRemove.some((uid) => currentAssignees.has(uid))
              );
            }));
          } catch {
            logger.warn('Failed to pre-fetch alert indices for workflow trigger (assignees)');
          }
        }

        return withSiemErrorHandling(response, async () => {
          const result = await updateAlertsAssignees({ context, index, ids, assignees });
          if (eventBus) {
            if (attackIds.length > 0) {
              void eventBus.emitAttackAssigneesChanged(request, {
                attackIds: attackIds.slice(0, MAX_ALERTS_PER_TRIGGER),
                assigneesToAdd: validAssigneesToAdd,
                assigneesToRemove: validAssigneesToRemove,
                truncated: attackIds.length > MAX_ALERTS_PER_TRIGGER || operationTruncated,
              });
            }
            if (alertIds.length > 0) {
              void eventBus.emitAlertAssigneesChanged(request, {
                alertIds: alertIds.slice(0, MAX_ALERTS_PER_TRIGGER),
                assigneesToAdd: validAssigneesToAdd,
                assigneesToRemove: validAssigneesToRemove,
                truncated: alertIds.length > MAX_ALERTS_PER_TRIGGER || operationTruncated,
              });
            }
          }
          return result;
        });
      }
    );
};
