/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';
import {
  ALERTS_API_ALL,
  ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE,
} from '@kbn/security-solution-features/constants';

import { SetAttacksAssigneesRequestBody } from '../../../../../common/api/detection_engine/attacks';
import { DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';
import {
  MAX_ALERTS_PER_TRIGGER,
  MAX_ASSIGNEE_UID_LENGTH,
  MAX_ASSIGNEES_PER_OPERATION,
} from '../../../../../common/workflows/triggers';
import { updateAlertsAssignees } from '../common/operations/update_alerts_assignees';
import { prefetchChangedListFieldIds } from '../common/operations/prefetch_previous_statuses';
import { validateAlertAssigneesArrays } from '../common/validators/validate_alert_arrays';
import { getAttackAlertsIndex } from '../common/index_patterns/get_attack_alerts_index';
import { executeCascadeListField } from './cascade_list_field_helpers';
import { buildSiemResponse } from '../utils';
import {
  ATTACKS_DUPLICATE_ASSIGNEES_VALIDATION_ERROR,
  buildAttacksAssigneesApiCallFields,
  reportAttacksApiCallError,
  withSiemErrorHandlingAndAttacksTelemetry,
} from './attacks_ebt_helpers';

export const setAttacksAssigneesRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataClient: IRuleDataClient | null,
  telemetrySender: ITelemetryEventsSender,
  eventBus?: SecuritySolutionEventBus,
  logger?: Logger
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL,
      access: 'public',
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
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SetAttacksAssigneesRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        const { ids, assignees, update_related_alerts: updateRelatedAlerts } = request.body;
        const telemetryFields = buildAttacksAssigneesApiCallFields(
          request.route.path,
          request.body
        );

        const validationErrors = validateAlertAssigneesArrays(assignees);
        if (validationErrors.length) {
          reportAttacksApiCallError(
            telemetrySender,
            telemetryFields,
            ATTACKS_DUPLICATE_ASSIGNEES_VALIDATION_ERROR
          );
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }

        // Compute assignee arrays once for both branches: allValid* for truncation detection,
        // valid* (capped) for the event payload.
        const allValidAssigneesToAdd = assignees.add.filter(
          (uid) => uid.length <= MAX_ASSIGNEE_UID_LENGTH
        );
        const allValidAssigneesToRemove = assignees.remove.filter(
          (uid) => uid.length <= MAX_ASSIGNEE_UID_LENGTH
        );
        const validAssigneesToAdd = allValidAssigneesToAdd.slice(0, MAX_ASSIGNEES_PER_OPERATION);
        const validAssigneesToRemove = allValidAssigneesToRemove.slice(
          0,
          MAX_ASSIGNEES_PER_OPERATION
        );
        const operationTruncated =
          allValidAssigneesToAdd.length !== assignees.add.length ||
          allValidAssigneesToRemove.length !== assignees.remove.length ||
          allValidAssigneesToAdd.length > MAX_ASSIGNEES_PER_OPERATION ||
          allValidAssigneesToRemove.length > MAX_ASSIGNEES_PER_OPERATION;

        // Attack indices scope the update by query, so unknown/non-attack ids are
        // filtered out naturally (they never match `terms: { _id }`).
        const attackIndex = await getAttackAlertsIndex({ context });

        if (!updateRelatedAlerts) {
          return withSiemErrorHandlingAndAttacksTelemetry(
            response,
            telemetrySender,
            telemetryFields,
            async () => {
              // prefetch failure suppresses the trigger; must not block the mutation
              let verifiedAttackIds: string[] = [];
              let attackAssigneesActuallyAdded = validAssigneesToAdd;
              let attackAssigneesActuallyRemoved = validAssigneesToRemove;
              if (eventBus) {
                try {
                  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
                  ({
                    changedIds: verifiedAttackIds,
                    actualAdded: attackAssigneesActuallyAdded,
                    actualRemoved: attackAssigneesActuallyRemoved,
                  } = await prefetchChangedListFieldIds(
                    esClient,
                    attackIndex,
                    ids,
                    ALERT_WORKFLOW_ASSIGNEE_IDS,
                    assignees.add,
                    assignees.remove,
                    validAssigneesToAdd,
                    validAssigneesToRemove
                  ));
                } catch (err) {
                  logger?.warn(`Failed to verify attack IDs for workflow trigger: ${err}`);
                }
              }
              const result = await updateAlertsAssignees({
                context,
                index: attackIndex,
                ids,
                assignees,
              });
              if (eventBus && verifiedAttackIds.length > 0) {
                void eventBus.emitAttackAssigneesChanged(request, {
                  attackIds: verifiedAttackIds.slice(0, MAX_ALERTS_PER_TRIGGER),
                  assigneesAdded: attackAssigneesActuallyAdded,
                  assigneesRemoved: attackAssigneesActuallyRemoved,
                  truncated:
                    verifiedAttackIds.length > MAX_ALERTS_PER_TRIGGER || operationTruncated,
                });
              }
              return result;
            }
          );
        }

        return withSiemErrorHandlingAndAttacksTelemetry(
          response,
          telemetrySender,
          telemetryFields,
          () =>
            executeCascadeListField({
              context,
              ruleDataClient,
              attackIndex,
              ids,
              field: ALERT_WORKFLOW_ASSIGNEE_IDS,
              rawToAdd: assignees.add,
              rawToRemove: assignees.remove,
              validToAdd: validAssigneesToAdd,
              validToRemove: validAssigneesToRemove,
              operationTruncated,
              mutate: (index, combinedIds) =>
                updateAlertsAssignees({ context, index, ids: combinedIds, assignees }),
              eventBus,
              emitAttack: (attackIds, actualAdded, actualRemoved, truncated) => {
                void eventBus?.emitAttackAssigneesChanged(request, {
                  attackIds,
                  assigneesAdded: actualAdded,
                  assigneesRemoved: actualRemoved,
                  truncated,
                });
              },
              emitAlert: (alertIds, actualAdded, actualRemoved, truncated) => {
                void eventBus?.emitAlertAssigneesChanged(request, {
                  alertIds,
                  assigneesAdded: actualAdded,
                  assigneesRemoved: actualRemoved,
                  truncated,
                });
              },
              logger,
            })
        );
      }
    );
};
