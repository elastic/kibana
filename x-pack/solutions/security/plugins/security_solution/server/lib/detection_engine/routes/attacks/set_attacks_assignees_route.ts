/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERT_ATTACK_DISCOVERY_ALERT_IDS } from '@kbn/elastic-assistant-common';
import {
  ALERTS_API_ALL,
  ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE,
} from '@kbn/security-solution-features/constants';

import { SetAttacksAssigneesRequestBody } from '../../../../../common/api/detection_engine/attacks';
import { DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import { updateAlertsAssignees } from '../common/operations/update_alerts_assignees';
import { searchAlerts } from '../common/operations/search_alerts';
import { validateAlertAssigneesArrays } from '../common/validators/validate_alert_arrays';
import { getAttackAlertsIndex } from '../common/index_patterns/get_attack_alerts_index';
import { getUnifiedAlertsIndex } from '../common/index_patterns/get_unified_alerts_index';
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
  telemetrySender: ITelemetryEventsSender
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

        // Attack indices scope the update by query, so unknown/non-attack ids are
        // filtered out naturally (they never match `terms: { _id }`).
        const attackIndex = await getAttackAlertsIndex({ context });

        if (!updateRelatedAlerts) {
          return withSiemErrorHandlingAndAttacksTelemetry(
            response,
            telemetrySender,
            telemetryFields,
            () => updateAlertsAssignees({ context, index: attackIndex, ids, assignees })
          );
        }

        return withSiemErrorHandlingAndAttacksTelemetry(
          response,
          telemetrySender,
          telemetryFields,
          async () => {
            // Pre-fetch the verified attack docs to read their related detection
            // alert ids; the attack index scope filters out unknown attack ids.
            const attackDocs = await searchAlerts({
              context,
              index: attackIndex,
              params: {
                query: { bool: { filter: { terms: { _id: ids } } } },
                _source: [ALERT_ATTACK_DISCOVERY_ALERT_IDS],
                size: ids.length,
              },
            });

            const verifiedAttackIds = attackDocs.hits.hits
              .map((hit) => hit._id)
              .filter((id): id is string => id != null);

            const relatedAlertIds = attackDocs.hits.hits.flatMap((hit) => {
              const source = hit._source as Record<string, unknown> | undefined;
              const alertIds = source?.[ALERT_ATTACK_DISCOVERY_ALERT_IDS];
              return Array.isArray(alertIds) ? (alertIds as string[]) : [];
            });

            const combinedIds = Array.from(new Set([...verifiedAttackIds, ...relatedAlertIds]));

            // Related detection alerts live outside the attack indices, so expand
            // the target to the unified index pattern for the cascade update.
            const index = await getUnifiedAlertsIndex({ context, ruleDataClient });

            return updateAlertsAssignees({ context, index, ids: combinedIds, assignees });
          }
        );
      }
    );
};
