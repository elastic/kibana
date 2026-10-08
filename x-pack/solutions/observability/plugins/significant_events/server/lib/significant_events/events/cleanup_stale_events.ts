/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import pLimit from 'p-limit';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { IRulesManagementClient } from '../../knowledge_indicators/knowledge_indicator_client/rules/rules_management_client';
import type { RuleEventsClient } from './rule_events_client';
import type { TriggerEmitter } from '../../../workflows/triggers/emit';
import { updateSignificantEventStatus } from './update_event_status';

const EVENTS_BATCH_SIZE = 1000;
const EVENT_STATUS_UPDATE_CONCURRENCY = 10;

export const STALE_EVENT_ASSESSMENT_NOTE = i18n.translate(
  'xpack.significantEvents.staleEventCleanup.assessmentNoteDescription',
  {
    defaultMessage: 'Automatically marked inactive because none of its backing rules exist.',
  }
);

export interface CleanupStaleEventsResult {
  scanned: number;
  closed: number;
  kept: number;
  skipped: number;
}

const getBackingRuleIds = (event: SignificantEventResponse): string[] => [
  ...new Set(
    (event.signals ?? []).flatMap((signal) =>
      signal.type === 'detection' && signal.metadata.rule_uuid ? [signal.metadata.rule_uuid] : []
    )
  ),
];

const iterateActiveEventBatches = async function* ({
  eventSearchClient,
  ruleUuids,
}: {
  eventSearchClient: RuleEventsClient;
  ruleUuids?: string[];
}): AsyncGenerator<SignificantEventResponse[]> {
  let afterGroupHash: string | undefined;

  while (true) {
    const result = await eventSearchClient.findLatestByCurrentStateBatch({
      status: ['active'],
      ruleUuids,
      afterGroupHash,
      batchSize: EVENTS_BATCH_SIZE,
    });

    if (result.hits.length === 0) {
      return;
    }

    yield result.hits;

    if (result.hits.length < EVENTS_BATCH_SIZE || result.lastGroupHash === undefined) {
      return;
    }
    afterGroupHash = result.lastGroupHash;
  }
};

/**
 * Cleans open events for the provided rule IDs; omitting them scans all open events, while an
 * empty array is a no-op.
 */
export const cleanupStaleEvents = async ({
  eventSearchClient,
  rulesClient,
  candidateRuleIds,
  alertEventsClient,
  emitTrigger,
}: {
  eventSearchClient: RuleEventsClient;
  rulesClient: IRulesManagementClient;
  candidateRuleIds?: string[];
  alertEventsClient: AlertEventsClientApi;
  emitTrigger?: TriggerEmitter;
}): Promise<CleanupStaleEventsResult> => {
  const uniqueCandidateRuleIds = candidateRuleIds
    ? [...new Set(candidateRuleIds)].filter(Boolean)
    : undefined;

  if (uniqueCandidateRuleIds?.length === 0) {
    return { scanned: 0, closed: 0, kept: 0, skipped: 0 };
  }

  let scanned = 0;
  let closed = 0;
  let skipped = 0;
  const updateLimit = pLimit(EVENT_STATUS_UPDATE_CONCURRENCY);

  for await (const events of iterateActiveEventBatches({
    eventSearchClient,
    ruleUuids: uniqueCandidateRuleIds,
  })) {
    scanned += events.length;

    const eventsWithRuleIds = events.map((event) => ({
      event,
      ruleIds: getBackingRuleIds(event),
    }));
    skipped += eventsWithRuleIds.filter(({ ruleIds }) => ruleIds.length === 0).length;

    const allRuleIds = [...new Set(eventsWithRuleIds.flatMap(({ ruleIds }) => ruleIds))];
    if (allRuleIds.length === 0) {
      continue;
    }

    // Resolve a batch before writing it so a lookup failure cannot mark events from that batch inactive.
    const existingRuleIds = new Set(await rulesClient.findExistingRuleIds(allRuleIds));
    const staleEvents = eventsWithRuleIds.filter(
      ({ ruleIds }) => ruleIds.length > 0 && ruleIds.every((ruleId) => !existingRuleIds.has(ruleId))
    );
    const results = await Promise.all(
      staleEvents.map(({ event }) =>
        updateLimit(() =>
          updateSignificantEventStatus({
            eventSearchClient,
            eventId: event.event_id,
            status: 'inactive',
            assessmentNote: STALE_EVENT_ASSESSMENT_NOTE,
            alertEventsClient,
            emitTrigger,
          })
        )
      )
    );
    closed += results.reduce((total, result) => total + result.updated, 0);
  }

  return {
    scanned,
    closed,
    kept: scanned - closed - skipped,
    skipped,
  };
};
