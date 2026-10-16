/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERT_WORKFLOW_TAGS } from '@kbn/rule-data-utils';
import {
  ALERTS_API_ALL,
  ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE,
} from '@kbn/security-solution-features/constants';

import { SetAttacksTagsRequestBody } from '../../../../../common/api/detection_engine/attacks';
import { DETECTION_ENGINE_ATTACKS_TAGS_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';
import {
  MAX_ALERTS_PER_TRIGGER,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_OPERATION,
} from '../../../../../common/workflows/triggers';
import { updateAlertsTags } from '../common/operations/update_alerts_tags';
import { prefetchChangedListFieldIds } from '../common/operations/prefetch_previous_statuses';
import { validateAlertTagsArrays } from '../common/validators/validate_alert_arrays';
import { getAttackAlertsIndex } from '../common/index_patterns/get_attack_alerts_index';
import { executeCascadeListField } from './cascade_list_field_helpers';
import { buildSiemResponse } from '../utils';
import {
  ATTACKS_DUPLICATE_TAGS_VALIDATION_ERROR,
  buildAttacksTagsApiCallFields,
  reportAttacksApiCallError,
  withSiemErrorHandlingAndAttacksTelemetry,
} from './attacks_ebt_helpers';

export const setAttacksTagsRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataClient: IRuleDataClient | null,
  telemetrySender: ITelemetryEventsSender,
  eventBus?: SecuritySolutionEventBus,
  logger?: Logger
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_ATTACKS_TAGS_URL,
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
            body: buildRouteValidationWithZod(SetAttacksTagsRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const { ids, tags, update_related_alerts: updateRelatedAlerts } = request.body;
        const telemetryFields = buildAttacksTagsApiCallFields(request.route.path, request.body);

        const validationErrors = validateAlertTagsArrays(tags, ids);
        if (validationErrors.length) {
          reportAttacksApiCallError(
            telemetrySender,
            telemetryFields,
            ATTACKS_DUPLICATE_TAGS_VALIDATION_ERROR
          );
          return buildSiemResponse(response).error({ statusCode: 400, body: validationErrors });
        }

        // Compute tag arrays once for both branches: allValid* for no-op/truncation detection,
        // valid* (capped) for the event payload.
        const allValidTagsToAdd = tags.tags_to_add.filter((t) => t.length <= MAX_TAG_LENGTH);
        const allValidTagsToRemove = tags.tags_to_remove.filter((t) => t.length <= MAX_TAG_LENGTH);
        const validTagsToAdd = allValidTagsToAdd.slice(0, MAX_TAGS_PER_OPERATION);
        const validTagsToRemove = allValidTagsToRemove.slice(0, MAX_TAGS_PER_OPERATION);
        const operationTruncated =
          allValidTagsToAdd.length !== tags.tags_to_add.length ||
          allValidTagsToRemove.length !== tags.tags_to_remove.length ||
          allValidTagsToAdd.length > MAX_TAGS_PER_OPERATION ||
          allValidTagsToRemove.length > MAX_TAGS_PER_OPERATION;

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
              let attackTagsActuallyAdded = validTagsToAdd;
              let attackTagsActuallyRemoved = validTagsToRemove;
              if (eventBus) {
                try {
                  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
                  ({
                    changedIds: verifiedAttackIds,
                    actualAdded: attackTagsActuallyAdded,
                    actualRemoved: attackTagsActuallyRemoved,
                  } = await prefetchChangedListFieldIds(
                    esClient,
                    attackIndex,
                    ids,
                    ALERT_WORKFLOW_TAGS,
                    tags.tags_to_add,
                    tags.tags_to_remove,
                    validTagsToAdd,
                    validTagsToRemove
                  ));
                } catch (err) {
                  logger?.warn(`Failed to verify attack IDs for workflow trigger: ${err}`);
                }
              }
              const result = await updateAlertsTags({ context, index: attackIndex, ids, tags });
              if (eventBus && verifiedAttackIds.length > 0) {
                void eventBus.emitAttackTagsChanged(request, {
                  attackIds: verifiedAttackIds.slice(0, MAX_ALERTS_PER_TRIGGER),
                  tagsAdded: attackTagsActuallyAdded,
                  tagsRemoved: attackTagsActuallyRemoved,
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
              field: ALERT_WORKFLOW_TAGS,
              rawToAdd: tags.tags_to_add,
              rawToRemove: tags.tags_to_remove,
              validToAdd: validTagsToAdd,
              validToRemove: validTagsToRemove,
              operationTruncated,
              mutate: (index, combinedIds) =>
                updateAlertsTags({ context, index, ids: combinedIds, tags }),
              eventBus,
              emitAttack: (attackIds, actualAdded, actualRemoved, truncated) => {
                void eventBus?.emitAttackTagsChanged(request, {
                  attackIds,
                  tagsAdded: actualAdded,
                  tagsRemoved: actualRemoved,
                  truncated,
                });
              },
              emitAlert: (alertIds, actualAdded, actualRemoved, truncated) => {
                void eventBus?.emitAlertTagsChanged(request, {
                  alertIds,
                  tagsAdded: actualAdded,
                  tagsRemoved: actualRemoved,
                  truncated,
                });
              },
              logger,
            })
        );
      }
    );
};
