/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import pLimit from 'p-limit';
import type { Logger } from '@kbn/core/server';
import type { IRulesManagementClient } from '../../knowledge_indicators/knowledge_indicator_client/rules/rules_management_client';
import type { RuleEventsClient } from './rule_events_client';
import { StatusChange } from './lifecycle/lifecycle_controller';

const EVENTS_BATCH_SIZE = 1000;
const EVENT_STATUS_UPDATE_CONCURRENCY = 10;
const MS_PER_HOUR = 60 * 60 * 1000;

export const STALE_EVENT_ASSESSMENT_NOTE = i18n.translate(
  'xpack.significantEvents.staleEventCleanup.assessmentNoteDescription',
  {
    defaultMessage: 'Automatically marked inactive because none of its backing rules exist.',
  }
);

export const RECOVERY_TIMEOUT_ASSESSMENT_NOTE = i18n.translate(
  'xpack.significantEvents.staleEventCleanup.recoveryTimeoutAssessmentNoteDescription',
  {
    defaultMessage:
      'Automatically marked inactive because it stayed recovering with no new evidence for longer than the cleanup timeout.',
  }
);

export interface CleanupStaleEventsResult {
  scanned: number;
  closed: number;
  /**
   * Closes written because of the recovery timeout (a subset of `closed`); an event whose rules are
   * all deleted counts as a rule-deleted close, not here.
   */
  timedOut: number;
  kept: number;
  skipped: number;
  failed: number;
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
      status: ['active', 'recovering'],
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

interface EventClosure {
  event: SignificantEventResponse;
  change: StatusChange;
  assessmentNote: string;
}

/** A recovering event is timed out when its latest version is older than the cutoff (epoch ms). */
const hasRecoveryTimedOut = ({
  event,
  cutoff,
}: {
  event: SignificantEventResponse;
  cutoff?: number;
}): boolean =>
  cutoff !== undefined && event.status === 'recovering' && Date.parse(event['@timestamp']) < cutoff;

/**
 * Cleans open events for the provided rule IDs; omitting them scans all open events, while an
 * empty array is a no-op. With `staleRecoveringAfterHours`, it also closes `recovering` events whose
 * latest version is older than that many hours; an event whose backing rules are all deleted is
 * closed as such instead.
 */
export const cleanupStaleEvents = async ({
  eventSearchClient,
  rulesClient,
  candidateRuleIds,
  workflowExecutionId,
  staleRecoveringAfterHours,
  now = new Date(),
  logger,
}: {
  eventSearchClient: RuleEventsClient;
  rulesClient: IRulesManagementClient;
  candidateRuleIds?: string[];
  workflowExecutionId?: string;
  staleRecoveringAfterHours?: number;
  now?: Date;
  logger?: Logger;
}): Promise<CleanupStaleEventsResult> => {
  const uniqueCandidateRuleIds = candidateRuleIds
    ? [...new Set(candidateRuleIds)].filter(Boolean)
    : undefined;

  if (uniqueCandidateRuleIds?.length === 0) {
    return { scanned: 0, closed: 0, timedOut: 0, kept: 0, skipped: 0, failed: 0 };
  }

  const timeoutCutoff =
    staleRecoveringAfterHours === undefined
      ? undefined
      : now.getTime() - staleRecoveringAfterHours * MS_PER_HOUR;

  let scanned = 0;
  let closed = 0;
  let timedOut = 0;
  let skipped = 0;
  let failed = 0;
  const updateLimit = pLimit(EVENT_STATUS_UPDATE_CONCURRENCY);

  for await (const events of iterateActiveEventBatches({
    eventSearchClient,
    ruleUuids: uniqueCandidateRuleIds,
  })) {
    scanned += events.length;

    const candidates = events.map((event) => ({
      event,
      ruleIds: getBackingRuleIds(event),
      hasTimedOut: hasRecoveryTimedOut({ event, cutoff: timeoutCutoff }),
    }));
    skipped += candidates.filter(
      ({ ruleIds, hasTimedOut }) => ruleIds.length === 0 && !hasTimedOut
    ).length;

    const allRuleIds = [...new Set(candidates.flatMap(({ ruleIds }) => ruleIds))];
    // Resolve a batch before writing it so a lookup failure cannot mark events from that batch inactive.
    const existingRuleIds = new Set(
      allRuleIds.length > 0 ? await rulesClient.findExistingRuleIds(allRuleIds) : []
    );
    const closures = candidates.flatMap(({ event, ruleIds, hasTimedOut }): EventClosure[] => {
      if (ruleIds.length > 0 && ruleIds.every((ruleId) => !existingRuleIds.has(ruleId))) {
        return [
          {
            event,
            change: StatusChange.ruleDeleted(),
            assessmentNote: STALE_EVENT_ASSESSMENT_NOTE,
          },
        ];
      }
      return hasTimedOut
        ? [
            {
              event,
              change: StatusChange.recoveryTimedOut(),
              assessmentNote: RECOVERY_TIMEOUT_ASSESSMENT_NOTE,
            },
          ]
        : [];
    });
    // One event that cannot be closed stays open and must not stop the rest of the cleanup.
    const results = await Promise.allSettled(
      closures.map(({ event, change, assessmentNote }) =>
        updateLimit(() =>
          eventSearchClient.updateEventStatus({
            eventId: event.event_id,
            actor: 'stale_event_cleanup',
            change,
            assessmentNote,
            expectedTimestamp: event['@timestamp'],
            workflowExecutionId,
          })
        )
      )
    );
    results.forEach((result, index) => {
      const { event, change } = closures[index];
      if (result.status === 'fulfilled') {
        closed += result.value.updated;
        if (change.kind === 'recovery_timeout') {
          timedOut += result.value.updated;
        }
        if (!result.value.updated && result.value.reason === 'superseded') {
          logger?.debug(
            `Stale event cleanup left event "${event.event_id}" open: a newer version exists`
          );
        }
        return;
      }
      failed += 1;
      const reason = result.reason instanceof Error ? result.reason.message : result.reason;
      logger?.warn(`Stale event cleanup could not close event "${event.event_id}": ${reason}`);
    });
  }

  return {
    scanned,
    closed,
    timedOut,
    kept: scanned - closed - skipped - failed,
    skipped,
    failed,
  };
};
