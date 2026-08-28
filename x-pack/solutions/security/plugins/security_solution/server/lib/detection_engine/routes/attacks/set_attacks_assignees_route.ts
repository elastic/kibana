/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERT_ATTACK_DISCOVERY_ALERT_IDS } from '@kbn/elastic-assistant-common';
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
import { searchAlerts } from '../common/operations/search_alerts';
import {
  verifyAlertIdsInIndex,
  fetchAllAlertIdIndexWithSource,
  computeActualDelta,
  wouldChange,
} from '../common/operations/prefetch_previous_statuses';
import { isAttackDiscoveryIndex } from '../common/operations/is_attack_discovery_index';
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
              // Verify which IDs actually exist in the attack index before emitting,
              // so the event payload never includes unknown/non-attack IDs.
              // Failures here must never block the mutation.
              let verifiedAttackIds: string[] = [];
              let attackAssigneesActuallyAdded = validAssigneesToAdd;
              let attackAssigneesActuallyRemoved = validAssigneesToRemove;
              if (eventBus) {
                try {
                  const attackDocs = await searchAlerts({
                    context,
                    index: attackIndex,
                    params: {
                      query: { bool: { filter: { terms: { _id: ids } } } },
                      _source: [ALERT_WORKFLOW_ASSIGNEE_IDS],
                      // `attackIndex` spans the scheduled and adhoc families and an _id can
                      // exist in both, so reserve a slot per family rather than one per id.
                      size: Math.min(ids.length * attackIndex.length, MAX_ALERTS_PER_TRIGGER),
                    },
                  });
                  // Emit only IDs that exist AND would actually change; deduplicate across
                  // families (an _id can appear in both scheduled and adhoc indices).
                  verifiedAttackIds = Array.from(
                    new Set(
                      attackDocs.hits.hits
                        .filter((hit) =>
                          wouldChange(
                            (hit._source ?? {}) as Record<string, unknown>,
                            ALERT_WORKFLOW_ASSIGNEE_IDS,
                            validAssigneesToAdd,
                            validAssigneesToRemove
                          )
                        )
                        .map((hit) => hit._id)
                        .filter((id): id is string => id != null)
                    )
                  );
                  const delta = computeActualDelta(
                    attackDocs.hits.hits.map(
                      (hit) => (hit._source ?? {}) as Record<string, unknown>
                    ),
                    validAssigneesToAdd,
                    validAssigneesToRemove,
                    ALERT_WORKFLOW_ASSIGNEE_IDS
                  );
                  attackAssigneesActuallyAdded = delta.actualAdded;
                  attackAssigneesActuallyRemoved = delta.actualRemoved;
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
                  attackIds: verifiedAttackIds,
                  assigneesAdded: attackAssigneesActuallyAdded,
                  assigneesRemoved: attackAssigneesActuallyRemoved,
                  truncated: ids.length > MAX_ALERTS_PER_TRIGGER || operationTruncated,
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
          async () => {
            // Pre-fetch the verified attack docs to read their related detection
            // alert ids; the attack index scope filters out unknown attack ids.
            const attackDocs = await searchAlerts({
              context,
              index: attackIndex,
              params: {
                query: { bool: { filter: { terms: { _id: ids } } } },
                _source: [ALERT_ATTACK_DISCOVERY_ALERT_IDS, ALERT_WORKFLOW_ASSIGNEE_IDS],
                // `attackIndex` spans the scheduled and adhoc families and an _id can exist
                // in both, so reserve a slot per family rather than one per requested id.
                size: Math.min(ids.length * attackIndex.length, MAX_ALERTS_PER_TRIGGER),
              },
            });

            // Emit only attack IDs that would actually change; deduplicate across families.
            const verifiedAttackIds = Array.from(
              new Set(
                attackDocs.hits.hits
                  .filter((hit) =>
                    wouldChange(
                      (hit._source ?? {}) as Record<string, unknown>,
                      ALERT_WORKFLOW_ASSIGNEE_IDS,
                      validAssigneesToAdd,
                      validAssigneesToRemove
                    )
                  )
                  .map((hit) => hit._id)
                  .filter((id): id is string => id != null)
              )
            );

            const attackSources = attackDocs.hits.hits.map(
              (hit) => (hit._source ?? {}) as Record<string, unknown>
            );
            const attackAssigneesDelta = computeActualDelta(
              attackSources,
              validAssigneesToAdd,
              validAssigneesToRemove,
              ALERT_WORKFLOW_ASSIGNEE_IDS
            );

            const relatedAlertIds = Array.from(
              new Set(
                attackDocs.hits.hits.flatMap((hit) => {
                  const source = hit._source as Record<string, unknown> | undefined;
                  const alertIds = source?.[ALERT_ATTACK_DISCOVERY_ALERT_IDS];
                  return Array.isArray(alertIds) ? (alertIds as string[]) : [];
                })
              )
            );

            const combinedIds = Array.from(new Set([...verifiedAttackIds, ...relatedAlertIds]));

            // Related detection alerts live outside the attack indices, so expand
            // the target to the unified index pattern for the cascade update.
            const index = await getUnifiedAlertsIndex({ context, ruleDataClient });

            // Pre-fetch related alert sources to compute the actual assignee delta and verify
            // they still exist; stale/deleted references must not appear in the payload.
            let verifiedRelatedAlertIds: string[] = [];
            let relatedAssigneesDelta = {
              actualAdded: validAssigneesToAdd,
              actualRemoved: validAssigneesToRemove,
            };
            if (eventBus && relatedAlertIds.length > 0) {
              try {
                const esClient = (await context.core).elasticsearch.client.asCurrentUser;
                const rawRelatedHits = await fetchAllAlertIdIndexWithSource(
                  esClient,
                  index,
                  relatedAlertIds,
                  [ALERT_WORKFLOW_ASSIGNEE_IDS]
                );
                // Exclude Attack Discovery hits: a stale related-alert ID that collides with
                // an AD doc must not be emitted as a detection-alert event. Deduplicate IDs
                // so the same alert doesn't consume multiple payload slots.
                const detectionHits = rawRelatedHits.filter(
                  (h) => !isAttackDiscoveryIndex(h.index)
                );
                verifiedRelatedAlertIds = Array.from(new Set(detectionHits.map((h) => h.id)));
                relatedAssigneesDelta = computeActualDelta(
                  detectionHits.map((h) => h.source),
                  validAssigneesToAdd,
                  validAssigneesToRemove,
                  ALERT_WORKFLOW_ASSIGNEE_IDS
                );
              } catch (err) {
                // Fall back to verifyAlertIdsInIndex when source fetch fails.
                try {
                  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
                  verifiedRelatedAlertIds = await verifyAlertIdsInIndex(
                    esClient,
                    index,
                    relatedAlertIds
                  );
                } catch (innerErr) {
                  logger?.warn(
                    `Failed to verify related alert IDs for workflow trigger (assignees): ${innerErr}`
                  );
                }
              }
            }

            const result = await updateAlertsAssignees({
              context,
              index,
              ids: combinedIds,
              assignees,
            });
            if (verifiedAttackIds.length > 0) {
              void eventBus?.emitAttackAssigneesChanged(request, {
                attackIds: verifiedAttackIds.slice(0, MAX_ALERTS_PER_TRIGGER),
                assigneesAdded: attackAssigneesDelta.actualAdded,
                assigneesRemoved: attackAssigneesDelta.actualRemoved,
                truncated: verifiedAttackIds.length > MAX_ALERTS_PER_TRIGGER || operationTruncated,
              });
            }
            if (verifiedRelatedAlertIds.length > 0) {
              void eventBus?.emitAlertAssigneesChanged(request, {
                alertIds: verifiedRelatedAlertIds.slice(0, MAX_ALERTS_PER_TRIGGER),
                assigneesAdded: relatedAssigneesDelta.actualAdded,
                assigneesRemoved: relatedAssigneesDelta.actualRemoved,
                truncated:
                  verifiedRelatedAlertIds.length > MAX_ALERTS_PER_TRIGGER || operationTruncated,
              });
            }
            return result;
          }
        );
      }
    );
};
