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
  MAX_ASSIGNEES_PER_OPERATION,
} from '../../../../../common/workflows/triggers';
import {
  fetchAllAlertIdIndexWithSource,
  computeActualDelta,
  wouldChange,
} from '../common/operations/prefetch_previous_statuses';

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

        const operationTruncated =
          assignees.add.length > MAX_ASSIGNEES_PER_OPERATION ||
          assignees.remove.length > MAX_ASSIGNEES_PER_OPERATION;

        const cappedAssigneesToAdd = assignees.add.slice(0, MAX_ASSIGNEES_PER_OPERATION);
        const cappedAssigneesToRemove = assignees.remove.slice(0, MAX_ASSIGNEES_PER_OPERATION);
        // Suppress the event if the prefetch fails: the delta is unknown and emitting
        // request intent as an observed fact violates the fact-style payload contract.
        let changedAlertIds: string[] = [];
        let assigneesActuallyAdded = cappedAssigneesToAdd;
        let assigneesActuallyRemoved = cappedAssigneesToRemove;
        if (eventBus) {
          try {
            const esClient = (await context.core).elasticsearch.client.asCurrentUser;
            const hits = await fetchAllAlertIdIndexWithSource(esClient, index, ids, [
              ALERT_WORKFLOW_ASSIGNEE_IDS,
            ]);
            // Emit only IDs whose source would actually change; unknown/no-op IDs are excluded.
            // Use the full request arrays for the predicate so over-cap assignees that would
            // actually change a document still produce a trigger; the payload uses capped arrays.
            changedAlertIds = hits
              .filter((h) =>
                wouldChange(h.source, ALERT_WORKFLOW_ASSIGNEE_IDS, assignees.add, assignees.remove)
              )
              .map((h) => h.id);
            const delta = computeActualDelta(
              hits.map((h) => h.source),
              cappedAssigneesToAdd,
              cappedAssigneesToRemove,
              ALERT_WORKFLOW_ASSIGNEE_IDS
            );
            assigneesActuallyAdded = delta.actualAdded;
            assigneesActuallyRemoved = delta.actualRemoved;
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
