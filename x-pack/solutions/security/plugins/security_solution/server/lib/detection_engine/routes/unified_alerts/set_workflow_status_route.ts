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

import { SetUnifiedAlertsWorkflowStatusRequestBody } from '../../../../../common/api/detection_engine/unified_alerts';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL } from '../../../../../common/constants';
import { updateAlertsWorkflowStatus } from '../common/operations/update_alerts_workflow_status';
import { validateClosingReason } from '../common/validators/validate_closing_reason';
import { getUnifiedAlertsIndex } from '../common/index_patterns/get_unified_alerts_index';
import { withSiemErrorHandling } from '../with_siem_error_handling';
import { buildSiemResponse } from '../utils';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';
import {
  prefetchAllPreviousStatusesByIds,
  type PreviousStatus,
} from '../common/operations/prefetch_previous_statuses';
import { isAttackDiscoveryIndex } from '../common/operations/is_attack_discovery_index';
import { MAX_ALERTS_PER_TRIGGER } from '../../../../../common/workflows/triggers';

export const setUnifiedAlertsWorkflowStatusRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataClient: IRuleDataClient | null,
  logger: Logger,
  eventBus?: SecuritySolutionEventBus
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
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
            body: buildRouteValidationWithZod(SetUnifiedAlertsWorkflowStatusRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const core = await context.core;
        const { status, signal_ids: ids } = request.body;
        const reason = 'reason' in request.body ? request.body.reason : undefined;

        const closingReason = await validateClosingReason({ core, status, reason });
        if (!closingReason.valid) {
          return buildSiemResponse(response).error({
            statusCode: 400,
            body: closingReason.message,
          });
        }

        const index = await getUnifiedAlertsIndex({ context, ruleDataClient });

        const alertIds: string[] = [];
        const attackIds: string[] = [];
        const alertPreviousStatuses: PreviousStatus[] = [];
        const attackPreviousStatuses: PreviousStatus[] = [];
        let prefetchSucceeded = false;

        if (eventBus) {
          try {
            const esClient = core.elasticsearch.client.asCurrentUser;
            // The unified index spans both detection-alert and attack-discovery families;
            // a given _id can appear in both, so reserve room for 2 hits per requested ID.
            const { hits } = await prefetchAllPreviousStatusesByIds(esClient, index, ids, 2);
            // Iterate ES hits directly (keyed by (index, id)) so that cross-index
            // _id collisions are handled correctly — ES only guarantees _id
            // uniqueness within an index, not across indices.
            for (const hit of hits) {
              // Only emit for IDs that are actually changing status
              const isNoOp = hit.previousStatus !== undefined && hit.previousStatus === status;
              if (!isNoOp) {
                if (isAttackDiscoveryIndex(hit.index)) {
                  attackIds.push(hit.id);
                  if (hit.previousStatus !== undefined)
                    attackPreviousStatuses.push({ id: hit.id, previousStatus: hit.previousStatus });
                } else {
                  alertIds.push(hit.id);
                  if (hit.previousStatus !== undefined)
                    alertPreviousStatuses.push({ id: hit.id, previousStatus: hit.previousStatus });
                }
              }
            }
            prefetchSucceeded = true;
          } catch {
            logger.warn('Failed to pre-fetch previous alert statuses for workflow trigger');
          }
        }

        return withSiemErrorHandling(response, async () => {
          const result = await updateAlertsWorkflowStatus({
            context,
            index,
            ids,
            status,
            reason: closingReason.reason,
          });
          if (prefetchSucceeded) {
            const attackTruncated = attackIds.length > MAX_ALERTS_PER_TRIGGER;
            const alertTruncated = alertIds.length > MAX_ALERTS_PER_TRIGGER;
            if (attackIds.length > 0) {
              void eventBus?.emitAttackStatusChanged(request, {
                attackIds: attackIds.slice(0, MAX_ALERTS_PER_TRIGGER),
                status,
                previousStatuses: attackPreviousStatuses.slice(0, MAX_ALERTS_PER_TRIGGER),
                truncated: attackTruncated,
              });
            }
            if (alertIds.length > 0) {
              void eventBus?.emitAlertStatusChanged(request, {
                alertIds: alertIds.slice(0, MAX_ALERTS_PER_TRIGGER),
                status,
                previousStatuses: alertPreviousStatuses.slice(0, MAX_ALERTS_PER_TRIGGER),
                truncated: alertTruncated,
              });
            }
          }
          return result;
        });
      }
    );
};
