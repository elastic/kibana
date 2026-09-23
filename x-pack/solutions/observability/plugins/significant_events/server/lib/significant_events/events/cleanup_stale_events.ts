/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import pLimit from 'p-limit';
import type { IRulesManagementClient } from '../../knowledge_indicators/knowledge_indicator_client/rules/rules_management_client';
import type { EventClient } from './event_client';
import { updateSignificantEventStatus } from './update_event_status';

const EVENTS_BATCH_SIZE = 1000;
const EVENT_STATUS_UPDATE_CONCURRENCY = 10;

export const STALE_EVENT_ASSESSMENT_NOTE = i18n.translate(
  'xpack.significantEvents.staleEventCleanup.assessmentNoteDescription',
  {
    defaultMessage: 'Automatically closed because none of its backing rules exist.',
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

const iterateOpenEventBatches = async function* ({
  eventClient,
  ruleUuids,
}: {
  eventClient: EventClient;
  ruleUuids?: string[];
}): AsyncGenerator<SignificantEventResponse[]> {
  let afterEventId: string | undefined;

  while (true) {
    const result = await eventClient.findLatestByCurrentStateBatch({
      status: ['open'],
      ruleUuids,
      afterEventId,
      batchSize: EVENTS_BATCH_SIZE,
    });

    if (result.hits.length === 0) {
      return;
    }

    yield result.hits;

    const lastEvent = result.hits.at(-1);
    if (result.hits.length < EVENTS_BATCH_SIZE || lastEvent === undefined) {
      return;
    }
    afterEventId = lastEvent.event_id;
  }
};

/**
 * Cleans open events for the provided rule IDs; omitting them scans all open events, while an
 * empty array is a no-op.
 */
export const cleanupStaleEvents = async ({
  eventClient,
  rulesClient,
  candidateRuleIds,
}: {
  eventClient: EventClient;
  rulesClient: IRulesManagementClient;
  candidateRuleIds?: string[];
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

  for await (const events of iterateOpenEventBatches({
    eventClient,
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

    // Resolve a batch before writing it so a lookup failure cannot close events from that batch.
    const existingRuleIds = new Set(await rulesClient.findExistingRuleIds(allRuleIds));
    const staleEvents = eventsWithRuleIds.filter(
      ({ ruleIds }) => ruleIds.length > 0 && ruleIds.every((ruleId) => !existingRuleIds.has(ruleId))
    );
    const results = await Promise.all(
      staleEvents.map(({ event }) =>
        updateLimit(() =>
          updateSignificantEventStatus({
            eventClient,
            eventUuid: event.event_uuid,
            status: 'closed',
            assessmentNote: STALE_EVENT_ASSESSMENT_NOTE,
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
