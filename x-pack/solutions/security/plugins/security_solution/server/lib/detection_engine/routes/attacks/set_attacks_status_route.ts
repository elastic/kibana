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
import {
  ALERTS_API_ALL,
  ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE,
} from '@kbn/security-solution-features/constants';

import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { SetAttacksStatusRequestBody } from '../../../../../common/api/detection_engine/attacks';
import { DETECTION_ENGINE_ATTACKS_STATUS_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';
import {
  prefetchAllPreviousStatusesByIds,
  collectStatusTransitions,
  toFoundHit,
  type FoundHit,
  type PreviousStatus,
} from '../common/operations/prefetch_previous_statuses';
import {
  emitAlertStatusChangedWithCap,
  emitAttackStatusChangedWithCap,
} from '../../../../workflows/triggers/emit_status_changed';
import { MAX_ALERTS_PER_TRIGGER } from '../../../../../common/workflows/triggers';
import { INSIGHTS_CHANNEL } from '../../../telemetry/constants';
import {
  createAlertStatusPayloads,
  getSessionIDfromKibanaRequest,
} from '../../../telemetry/insights';
import { updateAlertsWorkflowStatus } from '../common/operations/update_alerts_workflow_status';
import { searchAlerts } from '../common/operations/search_alerts';
import { validateClosingReason } from '../common/validators/validate_closing_reason';
import { getAttackAlertsIndex } from '../common/index_patterns/get_attack_alerts_index';
import { getUnifiedAlertsIndex } from '../common/index_patterns/get_unified_alerts_index';
import { isAttackDiscoveryIndex } from '../common/operations/is_attack_discovery_index';
import { buildSiemResponse } from '../utils';
import {
  ATTACKS_INVALID_CLOSING_REASON_ERROR,
  buildAttacksStatusApiCallFields,
  reportAttacksApiCallError,
  withSiemErrorHandlingAndAttacksTelemetry,
} from './attacks_ebt_helpers';

export const setAttacksStatusRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataClient: IRuleDataClient | null,
  telemetrySender: ITelemetryEventsSender,
  eventBus?: SecuritySolutionEventBus,
  logger?: Logger
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_ATTACKS_STATUS_URL,
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
            body: buildRouteValidationWithZod(SetAttacksStatusRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const core = await context.core;
        const { status, ids, update_related_alerts: updateRelatedAlerts } = request.body;
        const reason = 'reason' in request.body ? request.body.reason : undefined;
        const telemetryFields = buildAttacksStatusApiCallFields(request.route.path, request.body);

        const closingReason = await validateClosingReason({ core, status, reason });
        if (!closingReason.valid) {
          reportAttacksApiCallError(
            telemetrySender,
            telemetryFields,
            ATTACKS_INVALID_CLOSING_REASON_ERROR
          );
          return buildSiemResponse(response).error({
            statusCode: 400,
            body: closingReason.message,
          });
        }

        const clusterId = telemetrySender.getClusterID();
        const isTelemetryOptedIn = await telemetrySender.isTelemetryOptedIn();
        const user = core.security.authc.getCurrentUser();

        if (isTelemetryOptedIn && clusterId) {
          const sessionId = getSessionIDfromKibanaRequest(clusterId, request);
          if (user?.username && ids.length > 0 && sessionId && status) {
            const insightsPayloads = createAlertStatusPayloads(
              clusterId,
              ids,
              sessionId,
              user.username,
              DETECTION_ENGINE_ATTACKS_STATUS_URL,
              status
            );
            await telemetrySender.sendOnDemand(INSIGHTS_CHANNEL, insightsPayloads);
          }
        }

        // Attack indices scope the update by query, so unknown/non-attack ids are
        // filtered out naturally (they never match `terms: { _id }`).
        const attackIndex = await getAttackAlertsIndex({ context });

        if (!updateRelatedAlerts) {
          let filteredAttackIds: string[] = [];
          let filteredPreviousStatuses: PreviousStatus[] = [];
          if (eventBus) {
            try {
              const esClient = core.elasticsearch.client.asCurrentUser;
              // Chunked so an oversized request still sees every ID, and the helper reserves
              // one hit per attack index family (scheduled + adhoc) so an _id present in both
              // cannot push another requested ID out of the result window.
              const { hits } = await prefetchAllPreviousStatusesByIds(esClient, attackIndex, ids);
              ({ ids: filteredAttackIds, previousStatuses: filteredPreviousStatuses } =
                collectStatusTransitions(hits, status));
            } catch (err) {
              logger?.warn(
                `Failed to pre-fetch previous statuses for workflow trigger (attacks status): ${err}`
              );
            }
          }
          return withSiemErrorHandlingAndAttacksTelemetry(
            response,
            telemetrySender,
            telemetryFields,
            async () => {
              const result = await updateAlertsWorkflowStatus({
                context,
                index: attackIndex,
                ids,
                status,
                reason: closingReason.reason,
              });
              if (eventBus) {
                emitAttackStatusChangedWithCap(
                  eventBus,
                  request,
                  status,
                  filteredAttackIds,
                  filteredPreviousStatuses,
                  logger
                );
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
                _source: [ALERT_ATTACK_DISCOVERY_ALERT_IDS, ALERT_WORKFLOW_STATUS, 'signal.status'],
                // `attackIndex` spans the scheduled and adhoc families and an _id can exist
                // in both, so reserve a slot per family rather than one per requested ID.
                size: Math.min(ids.length * attackIndex.length, MAX_ALERTS_PER_TRIGGER),
              },
            });

            // Map to FoundHit so status-less attacks — which the update script never
            // mutates — are distinguishable from attacks with an unrecognized status.
            const attackHits = attackDocs.hits.hits.flatMap((hit) => {
              const found = toFoundHit(hit);
              return found !== undefined ? [found] : [];
            });
            const verifiedAttackIds = Array.from(new Set(attackHits.map((hit) => hit.id)));

            const relatedAlertIds = attackDocs.hits.hits.flatMap((hit) => {
              const source = hit._source as Record<string, unknown> | undefined;
              const alertIds = source?.[ALERT_ATTACK_DISCOVERY_ALERT_IDS];
              return Array.isArray(alertIds) ? (alertIds as string[]) : [];
            });

            const combinedIds = Array.from(new Set([...verifiedAttackIds, ...relatedAlertIds]));

            // Related detection alerts live outside the attack indices, so expand
            // the target to the unified index pattern for the cascade update.
            const index = await getUnifiedAlertsIndex({ context, ruleDataClient });

            let relatedAlertHits: FoundHit[] = [];
            if (eventBus && relatedAlertIds.length > 0) {
              try {
                const esClient = core.elasticsearch.client.asCurrentUser;
                // Chunked, and one reserved hit per unified index family, so no related
                // alert is dropped by the result window.
                const { hits } = await prefetchAllPreviousStatusesByIds(
                  esClient,
                  index,
                  relatedAlertIds
                );
                relatedAlertHits = hits;
              } catch (err) {
                logger?.warn(
                  `Failed to pre-fetch previous statuses for workflow trigger (attacks cascade status): ${err}`
                );
              }
            }

            const result = await updateAlertsWorkflowStatus({
              context,
              index,
              ids: combinedIds,
              status,
              reason: closingReason.reason,
            });

            const { ids: changingAttackIds, previousStatuses: changingAttacks } =
              collectStatusTransitions(attackHits, status);
            // Same pattern for related detection alerts.
            // Exclude any hits that landed in an Attack Discovery index: the unified index
            // contains both families, so a stale related-alert ID that collides with an AD
            // doc _id must not be emitted as a detection-alert event.
            const { ids: changingRelatedIds, previousStatuses: changingRelated } =
              collectStatusTransitions(
                relatedAlertHits.filter((hit) => !isAttackDiscoveryIndex(hit.index)),
                status
              );
            if (eventBus) {
              emitAttackStatusChangedWithCap(
                eventBus,
                request,
                status,
                changingAttackIds,
                changingAttacks,
                logger
              );
              emitAlertStatusChangedWithCap(
                eventBus,
                request,
                status,
                changingRelatedIds,
                changingRelated,
                logger
              );
            }
            return result;
          }
        );
      }
    );
};
