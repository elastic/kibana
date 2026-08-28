/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { Logger } from '@kbn/core/server';
import { ALERT_ATTACK_DISCOVERY_ALERT_IDS } from '@kbn/elastic-assistant-common';
import type { SecuritySolutionRequestHandlerContext } from '../../../../types';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';
import { MAX_ALERTS_PER_TRIGGER } from '../../../../../common/workflows/triggers';
import {
  fetchAllAlertIdIndexWithSource,
  computeActualDelta,
  wouldChange,
} from '../common/operations/prefetch_previous_statuses';
import { isAttackDiscoveryIndex } from '../common/operations/is_attack_discovery_index';
import { getUnifiedAlertsIndex } from '../common/index_patterns/get_unified_alerts_index';

type EmitFn = (
  ids: string[],
  actualAdded: string[],
  actualRemoved: string[],
  truncated: boolean
) => void;

// The only caller-specific parts are `field`, the add/remove arrays, `mutate`, and the emit
// callbacks — everything else is identical between the tags and assignees cascade branches.
export const executeCascadeListField = async <T>({
  context,
  ruleDataClient,
  attackIndex,
  ids,
  field,
  rawToAdd,
  rawToRemove,
  validToAdd,
  validToRemove,
  operationTruncated,
  mutate,
  eventBus,
  emitAttack,
  emitAlert,
  logger,
}: {
  context: SecuritySolutionRequestHandlerContext;
  ruleDataClient: IRuleDataClient | null;
  attackIndex: string[];
  ids: string[];
  field: string;
  rawToAdd: string[];
  rawToRemove: string[];
  validToAdd: string[];
  validToRemove: string[];
  operationTruncated: boolean;
  mutate: (index: string | string[], combinedIds: string[]) => Promise<T>;
  eventBus?: SecuritySolutionEventBus;
  emitAttack: EmitFn;
  emitAlert: EmitFn;
  logger?: Logger;
}): Promise<T> => {
  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
  const attackHits = await fetchAllAlertIdIndexWithSource(esClient, attackIndex, ids, [
    ALERT_ATTACK_DISCOVERY_ALERT_IDS,
    field,
  ]);

  // All found attack IDs drive the mutation; deduplicated across index families.
  const allFoundAttackIds = Array.from(new Set(attackHits.map((h) => h.id)));
  // Trigger emission uses only IDs that would actually change under the full request arrays,
  // so over-length/over-cap values that would genuinely change a document still fire.
  const verifiedAttackIds = Array.from(
    new Set(
      attackHits.filter((h) => wouldChange(h.source, field, rawToAdd, rawToRemove)).map((h) => h.id)
    )
  );
  const attackSources = attackHits.map((h) => h.source);
  const attackDelta = computeActualDelta(attackSources, validToAdd, validToRemove, field);

  const relatedAlertIds = Array.from(
    new Set(
      attackHits.flatMap((h) => {
        const alertIds = h.source[ALERT_ATTACK_DISCOVERY_ALERT_IDS];
        return Array.isArray(alertIds) ? (alertIds as string[]) : [];
      })
    )
  );

  const combinedIds = Array.from(new Set([...allFoundAttackIds, ...relatedAlertIds]));
  const index = await getUnifiedAlertsIndex({ context, ruleDataClient });

  let verifiedRelatedAlertIds: string[] = [];
  let relatedDelta = { actualAdded: validToAdd, actualRemoved: validToRemove };
  if (eventBus && relatedAlertIds.length > 0) {
    try {
      const rawRelatedHits = await fetchAllAlertIdIndexWithSource(
        esClient,
        index,
        relatedAlertIds,
        [field]
      );
      // Exclude Attack Discovery hits: a stale related-alert ID that collides with an AD doc
      // must not be emitted as a detection-alert event.
      const detectionHits = rawRelatedHits.filter((h) => !isAttackDiscoveryIndex(h.index));
      // Only emit for alerts that would actually change; a no-op cascade must not fire
      // the alert event, and unchanged IDs must not consume the 10,000-ID cap.
      verifiedRelatedAlertIds = Array.from(
        new Set(
          detectionHits
            .filter((h) => wouldChange(h.source, field, rawToAdd, rawToRemove))
            .map((h) => h.id)
        )
      );
      relatedDelta = computeActualDelta(
        detectionHits.map((h) => h.source),
        validToAdd,
        validToRemove,
        field
      );
    } catch (err) {
      // Source-fetch failed; suppress the fact event for related alerts rather than
      // emitting request intent as observed fact (delta is unknown).
      logger?.warn(`Failed to fetch related alert sources for workflow trigger: ${err}`);
    }
  }

  const result = await mutate(index, combinedIds);

  if (verifiedAttackIds.length > 0) {
    emitAttack(
      verifiedAttackIds.slice(0, MAX_ALERTS_PER_TRIGGER),
      attackDelta.actualAdded,
      attackDelta.actualRemoved,
      verifiedAttackIds.length > MAX_ALERTS_PER_TRIGGER || operationTruncated
    );
  }
  if (verifiedRelatedAlertIds.length > 0) {
    emitAlert(
      verifiedRelatedAlertIds.slice(0, MAX_ALERTS_PER_TRIGGER),
      relatedDelta.actualAdded,
      relatedDelta.actualRemoved,
      verifiedRelatedAlertIds.length > MAX_ALERTS_PER_TRIGGER || operationTruncated
    );
  }

  return result;
};
