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
  collectStatusTransitions,
} from '../common/operations/prefetch_previous_statuses';
import type { PreviousStatus } from '../../../../events/types';
import { isAttackDiscoveryIndex } from '../common/operations/is_attack_discovery_index';
import {
  emitAttackStatusChangedWithCap,
  emitAlertStatusChangedWithCap,
} from '../../../../workflows/triggers/emit_status_changed';

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

        let alertIds: string[] = [];
        let attackIds: string[] = [];
        let alertPreviousStatuses: PreviousStatus[] = [];
        let attackPreviousStatuses: PreviousStatus[] = [];
        let prefetchSucceeded = false;

        if (eventBus) {
          try {
            const esClient = core.elasticsearch.client.asCurrentUser;
            // The helper reserves one hit per index family in `index` (detection alerts
            // plus the scheduled and adhoc attack-discovery indices), so a given _id that
            // exists in several of them is fully retrieved.
            const { hits } = await prefetchAllPreviousStatusesByIds(esClient, index, ids);
            // Split by (index, id) rather than id alone: ES only guarantees _id uniqueness
            // within an index, so the same _id can be a detection alert and an attack.
            ({ ids: attackIds, previousStatuses: attackPreviousStatuses } =
              collectStatusTransitions(
                hits.filter((hit) => isAttackDiscoveryIndex(hit.index)),
                status
              ));
            ({ ids: alertIds, previousStatuses: alertPreviousStatuses } = collectStatusTransitions(
              hits.filter((hit) => !isAttackDiscoveryIndex(hit.index)),
              status
            ));
            prefetchSucceeded = true;
          } catch (err) {
            logger.warn(`Failed to pre-fetch previous alert statuses for workflow trigger: ${err}`);
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
          if (prefetchSucceeded && eventBus) {
            emitAttackStatusChangedWithCap(
              eventBus,
              request,
              status,
              attackIds,
              attackPreviousStatuses,
              logger
            );
            emitAlertStatusChangedWithCap(
              eventBus,
              request,
              status,
              alertIds,
              alertPreviousStatuses,
              logger
            );
          }
          return result;
        });
      }
    );
};
