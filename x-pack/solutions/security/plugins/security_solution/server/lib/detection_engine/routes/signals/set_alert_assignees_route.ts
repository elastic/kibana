/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  ALERTS_API_ALL,
  ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE,
} from '@kbn/security-solution-features/constants';
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';
import { SetAlertAssigneesRequestBody } from '../../../../../common/api/detection_engine/alert_assignees';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import {
  DEFAULT_ALERTS_INDEX,
  DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
} from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import { validateAlertAssigneesArrays } from '../common/validators/validate_alert_arrays';
import { updateAlertsAssignees } from '../common/operations/update_alerts_assignees';
import { withSiemErrorHandling } from '../with_siem_error_handling';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';
import {
  MAX_ALERTS_PER_TRIGGER,
  MAX_ASSIGNEE_UID_LENGTH,
  MAX_ASSIGNEES_PER_OPERATION,
} from '../../../../../common/workflows/triggers';
import { prefetchChangedListFieldIds } from '../common/operations/prefetch_previous_statuses';

export const setAlertAssigneesRoute = (
  router: SecuritySolutionPluginRouter,
  eventBus?: SecuritySolutionEventBus
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
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
            body: buildRouteValidationWithZod(SetAlertAssigneesRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        const { ids, assignees } = request.body;

        const validationErrors = validateAlertAssigneesArrays(assignees);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }

        const securitySolution = await context.securitySolution;
        const spaceId = securitySolution?.getSpaceId() ?? 'default';
        const index = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

        const allValidAssigneesToAdd = assignees.add.filter(
          (uid) => uid.length <= MAX_ASSIGNEE_UID_LENGTH
        );
        const allValidAssigneesToRemove = assignees.remove.filter(
          (uid) => uid.length <= MAX_ASSIGNEE_UID_LENGTH
        );
        const cappedAssigneesToAdd = allValidAssigneesToAdd.slice(0, MAX_ASSIGNEES_PER_OPERATION);
        const cappedAssigneesToRemove = allValidAssigneesToRemove.slice(
          0,
          MAX_ASSIGNEES_PER_OPERATION
        );
        const operationTruncated =
          allValidAssigneesToAdd.length !== assignees.add.length ||
          allValidAssigneesToRemove.length !== assignees.remove.length ||
          allValidAssigneesToAdd.length > MAX_ASSIGNEES_PER_OPERATION ||
          allValidAssigneesToRemove.length > MAX_ASSIGNEES_PER_OPERATION;
        // Suppress the event if the prefetch fails: the delta is unknown and emitting
        // request intent as an observed fact violates the fact-style payload contract.
        let changedAlertIds: string[] = [];
        let assigneesActuallyAdded = cappedAssigneesToAdd;
        let assigneesActuallyRemoved = cappedAssigneesToRemove;
        if (eventBus) {
          try {
            const esClient = (await context.core).elasticsearch.client.asCurrentUser;
            ({
              changedIds: changedAlertIds,
              actualAdded: assigneesActuallyAdded,
              actualRemoved: assigneesActuallyRemoved,
            } = await prefetchChangedListFieldIds(
              esClient,
              index,
              ids,
              ALERT_WORKFLOW_ASSIGNEE_IDS,
              assignees.add,
              assignees.remove,
              cappedAssigneesToAdd,
              cappedAssigneesToRemove
            ));
          } catch {
            // prefetch failure is non-blocking; changedAlertIds stays empty, suppressing the event
          }
        }

        return withSiemErrorHandling(response, async () => {
          const result = await updateAlertsAssignees({ context, index, ids, assignees });
          if (eventBus && changedAlertIds.length > 0) {
            void eventBus.emitAlertAssigneesChanged(request, {
              alertIds: changedAlertIds.slice(0, MAX_ALERTS_PER_TRIGGER),
              assigneesAdded: assigneesActuallyAdded,
              assigneesRemoved: assigneesActuallyRemoved,
              truncated: changedAlertIds.length > MAX_ALERTS_PER_TRIGGER || operationTruncated,
            });
          }
          return result;
        });
      }
    );
};
