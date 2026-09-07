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
        return withSiemErrorHandling(response, async () => {
          const result = await updateAlertsAssignees({ context, index, ids, assignees });
          void eventBus?.emitAlertAssigneesChanged(request, {
            alertIds: ids.slice(0, MAX_ALERTS_PER_TRIGGER),
            assigneesToAdd: assignees.add.slice(0, MAX_ASSIGNEES_PER_OPERATION),
            assigneesToRemove: assignees.remove.slice(0, MAX_ASSIGNEES_PER_OPERATION),
            truncated: ids.length > MAX_ALERTS_PER_TRIGGER || operationTruncated,
          });
          return result;
        });
      }
    );
};
