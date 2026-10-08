/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { QueryLink, SignificantEventResponse } from '@kbn/significant-events-schema';
import pLimit from 'p-limit';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';
import type { TriggerEmitter } from '../../../workflows/triggers/emit';
import type { RuleEventsClient } from './rule_events_client';
import { probeMemberOutcome, type ProbeWindow } from './member_breach_probe';
import { isBreachMemberSignal } from './event_members';
import { applyLifecycleInput, type LifecycleControllerResult } from './lifecycle_controller';
import {
  aggregateStatusOutcomes,
  RECOVERING_COUNT,
  type LiveStatus,
  type StatusOutcome,
} from './status_transition';
import { selectForEvaluation } from './select_for_evaluation';

const LIVE_STATUSES: LiveStatus[] = ['active', 'recovering'];
const SCAN_BATCH_SIZE = 1000;
const EVALUATION_CONCURRENCY = 10;

/**
 * Per-run cap on live series evaluated (target architecture §5): the rest are deferred by writing
 * nothing, so a deferred series neither recovers nor re-tiers because of the deferral. Deferral
 * is by KI severity score, with a fixed share of slots rotating over all live series (see
 * `selectForEvaluation`).
 */
export const MAX_LIVE_REEVALUATIONS_PER_RUN = 50;

/**
 * Per-run cap on stored queries run: one series can carry many member rules, so the series cap
 * alone does not bound the cost. A series that would exceed it is deferred whole (a series closes
 * only when every member is judged, so a partial probe is never acted on).
 */
export const MAX_MEMBER_PROBES_PER_RUN = 500;

/** Keeps a series in order while the running member total stays within `budget`. */
const withinProbeBudget = <T extends { members: unknown[] }>(series: T[], budget: number): T[] => {
  let used = 0;
  return series.filter(({ members }) => {
    if (used > 0 && used + members.length > budget) {
      return false;
    }
    used += members.length;
    return true;
  });
};

export interface ReconcileEventStatusResult {
  /** Probe window actually used (minutes): the interval, widened to the detector lookback. */
  windowMinutes: number;
  scanned: number;
  /** Operator-pinned `active` (the director's user lock); never evaluated. */
  held: number;
  /** Over the per-run cap; status stands. */
  deferred: number;
  evaluated: number;
  recovering: number;
  inactivated: number;
  reactivated: number;
  /** Evaluated but nothing to write: still breaching, or a member could not be judged. */
  unchanged: number;
  /** Evaluated, but the series changed after it was read, so the transition was dropped. */
  superseded: number;
  /** Evaluated with at least one member that could not be judged (a subset of `unchanged`). */
  noData: number;
  failed: number;
}

interface LiveSeries {
  event: SignificantEventResponse;
  status: LiveStatus;
  groupHash: string;
  /** Rules whose confirming signals put this series on the event. */
  members: Array<{ ruleId: string; name: string }>;
  /** Highest KI severity score among the members; orders deferral. */
  severityScore: number;
}

const isLiveStatus = (status: string): status is LiveStatus =>
  (LIVE_STATUSES as readonly string[]).includes(status);

const toLiveSeries = (event: SignificantEventResponse, groupHash: string): LiveSeries[] => {
  if (!isLiveStatus(event.status)) {
    return [];
  }

  const confirmed = (event.signals ?? []).flatMap((signal) =>
    signal.type === 'detection' && isBreachMemberSignal(signal) ? [signal.metadata] : []
  );
  const membersByRuleId = new Map(
    confirmed.map(({ rule_uuid: ruleId, rule_name: name }) => [ruleId, { ruleId, name }])
  );

  // An event with no members (a chat-created one) is never evaluated and is closed only by an
  // operator, so it must not take evaluation or probe capacity from series that can be judged.
  if (membersByRuleId.size === 0) {
    return [];
  }

  return [
    {
      event,
      status: event.status,
      groupHash,
      members: [...membersByRuleId.values()].map(({ ruleId, name }) => ({
        ruleId,
        name: name ?? '',
      })),
      severityScore: Math.max(-1, ...confirmed.map(({ severity_score: score }) => score ?? -1)),
    },
  ];
};

const scanLiveSeries = async (eventSearchClient: RuleEventsClient): Promise<LiveSeries[]> => {
  const series: LiveSeries[] = [];
  let afterGroupHash: string | undefined;

  while (true) {
    const { hits, groupHashes, lastGroupHash } =
      await eventSearchClient.findLatestByCurrentStateBatch({
        status: LIVE_STATUSES,
        afterGroupHash,
        batchSize: SCAN_BATCH_SIZE,
      });
    hits.forEach((event, index) => series.push(...toLiveSeries(event, groupHashes[index])));

    if (hits.length < SCAN_BATCH_SIZE || lastGroupHash === undefined) {
      return series;
    }
    afterGroupHash = lastGroupHash;
  }
};

const MAX_NOTE_MEMBERS = 5;

/** `name: outcome` per member, capped so the note stays within its length limit. */
const describeMembers = (members: Array<{ name: string; outcome: StatusOutcome }>): string => {
  const shown = members
    .slice(0, MAX_NOTE_MEMBERS)
    .map(({ name, outcome }) => `${name}: ${outcome === 'no_data' ? 'no data' : outcome}`);
  const hidden = members.length - shown.length;
  return hidden > 0 ? `${shown.join(', ')}, +${hidden} more` : shown.join(', ');
};

const assessmentNote = ({
  status,
  windowMinutes,
  recoveringCount,
  members,
}: {
  status: 'active' | 'recovering' | 'inactive';
  windowMinutes: number;
  recoveringCount: number;
  members: Array<{ name: string; outcome: StatusOutcome }>;
}): string => {
  const memberOutcomes = describeMembers(members);
  switch (status) {
    case 'recovering':
      return i18n.translate('xpack.significantEvents.statusReconciliation.recoveringNote', {
        defaultMessage:
          'Automatically marked recovering: none of its member rules matched in the last {windowMinutes} minutes ({memberOutcomes}).',
        values: { windowMinutes, memberOutcomes },
      });
    case 'inactive':
      return i18n.translate('xpack.significantEvents.statusReconciliation.inactiveNote', {
        defaultMessage:
          'Automatically marked inactive after {recoveringCount} evaluations in recovering with no member rule matching in the last {windowMinutes} minutes ({memberOutcomes}).',
        values: { recoveringCount, windowMinutes, memberOutcomes },
      });
    default:
      return i18n.translate('xpack.significantEvents.statusReconciliation.reactivatedNote', {
        defaultMessage:
          'Returned to active: a member rule matched again in the last {windowMinutes} minutes ({memberOutcomes}).',
        values: { windowMinutes, memberOutcomes },
      });
  }
};

/** Counts what one applied evaluation did, for the run's summary. */
const tallyApplied = (
  result: ReconcileEventStatusResult,
  applied: LifecycleControllerResult
): void => {
  if (applied.reason === 'superseded') {
    result.superseded++;
  } else if (applied.updated === 0) {
    result.unchanged++;
    if (applied.reason === 'no_data') {
      result.noData++;
    }
  } else if (applied.status === 'inactive') {
    result.inactivated++;
  } else if (applied.status === 'active') {
    result.reactivated++;
  } else {
    result.recovering++;
  }
};

/**
 * One scheduled evaluation of every live series (`active` or `recovering`): each member rule's
 * stored KI query is run over the last `windowMinutes`, the series outcome feeds `nextStatus`, and
 * a transition is written through the same path as any other status change. No agent call.
 *
 * `streamDataEsClient` runs the stored KI queries against stream data; every read of the event
 * history, including the operator holds, goes through `eventSearchClient`.
 */
export const reconcileEventStatus = async ({
  eventSearchClient,
  knowledgeIndicatorClient,
  streamDataEsClient,
  alertEventsClient,
  emitTrigger,
  logger,
  windowMinutes,
  lookbackMinutes,
  now = new Date(),
  maxEvaluations = MAX_LIVE_REEVALUATIONS_PER_RUN,
  maxMemberProbes = MAX_MEMBER_PROBES_PER_RUN,
  recoveringCount = RECOVERING_COUNT,
}: {
  eventSearchClient: RuleEventsClient;
  knowledgeIndicatorClient: KnowledgeIndicatorClient;
  streamDataEsClient: ElasticsearchClient;
  alertEventsClient: AlertEventsClientApi;
  emitTrigger?: TriggerEmitter;
  logger: Logger;
  /** The evaluation interval: the length of one tick, and the floor of the probe window. */
  windowMinutes: number;
  /**
   * How far back the detector can still flag a breach. The probe window never goes below it, so
   * the engine cannot call a series clean while the detector (and so the agent) still sees the
   * breach, which would flip the event between `recovering` and `active`.
   */
  lookbackMinutes?: number;
  now?: Date;
  maxEvaluations?: number;
  maxMemberProbes?: number;
  recoveringCount?: number;
}): Promise<ReconcileEventStatusResult> => {
  const probeMinutes = Math.max(windowMinutes, lookbackMinutes ?? 0);
  const result: ReconcileEventStatusResult = {
    windowMinutes: probeMinutes,
    scanned: 0,
    held: 0,
    deferred: 0,
    evaluated: 0,
    recovering: 0,
    inactivated: 0,
    reactivated: 0,
    unchanged: 0,
    superseded: 0,
    noData: 0,
    failed: 0,
  };

  const live = await scanLiveSeries(eventSearchClient);
  result.scanned = live.length;
  if (live.length === 0) {
    return result;
  }

  const heldGroupHashes = await eventSearchClient.findOperatorHeldGroupHashes(
    live.map(({ groupHash }) => groupHash)
  );
  const candidates = live.filter(({ groupHash }) => !heldGroupHashes.has(groupHash));
  result.held = live.length - candidates.length;

  const evaluating = withinProbeBudget(
    selectForEvaluation({
      candidates: candidates.map((series) => ({
        ...series,
        id: series.event.event_id,
      })),
      limit: maxEvaluations,
      tick: Math.floor(now.getTime() / (windowMinutes * 60_000)),
    }),
    maxMemberProbes
  );
  result.deferred = candidates.length - evaluating.length;
  if (evaluating.length === 0) {
    return result;
  }

  const ruleIds = [
    ...new Set(evaluating.flatMap(({ members }) => members.map(({ ruleId }) => ruleId))),
  ];
  const links: QueryLink[] =
    ruleIds.length === 0
      ? []
      : await knowledgeIndicatorClient.getQueryLinks(
          [...new Set(evaluating.flatMap(({ event }) => event.stream_names))],
          { ruleIds, includeExpired: true }
        );
  const linksByRuleId = new Map(links.map((link) => [link.rule_id, link]));

  const window: ProbeWindow = {
    from: new Date(now.getTime() - probeMinutes * 60_000).toISOString(),
    to: now.toISOString(),
  };
  const limit = pLimit(EVALUATION_CONCURRENCY);

  const evaluateSeries = async (series: LiveSeries): Promise<LifecycleControllerResult> => {
    const outcomes: StatusOutcome[] = await Promise.all(
      series.members.map(({ ruleId }) =>
        probeMemberOutcome({
          esClient: streamDataEsClient,
          link: linksByRuleId.get(ruleId),
          window,
          logger,
        })
      )
    );

    return applyLifecycleInput({
      eventSearchClient,
      eventId: series.event.event_id,
      input: { kind: 'evaluation', outcome: aggregateStatusOutcomes(outcomes) },
      annotate: (status) => ({
        assessmentNote: assessmentNote({
          status: status as 'active' | 'recovering' | 'inactive',
          windowMinutes: probeMinutes,
          recoveringCount,
          members: series.members.map(({ name }, index) => ({
            name,
            outcome: outcomes[index],
          })),
        }),
      }),
      expectedTimestamp: series.event['@timestamp'],
      recoveringCount,
      alertEventsClient,
      emitTrigger,
    });
  };

  await Promise.all(
    evaluating.map((series) =>
      limit(async () => {
        result.evaluated++;
        try {
          let applied = await evaluateSeries(series);

          // A discovery write carrying new evidence appends a version while the series is read, so
          // the evaluation is re-run once against the fresh version instead of dropping the tick;
          // otherwise a detector that keeps re-firing would starve a recovering series of
          // evaluations.
          if (applied.reason === 'superseded') {
            const refreshed = await eventSearchClient.findLatestByEventId(series.event.event_id);
            const [next] = refreshed ? toLiveSeries(refreshed, series.groupHash) : [];
            if (next) {
              // The write may have added members the first pass never resolved a query for.
              const unresolved = next.members
                .map(({ ruleId }) => ruleId)
                .filter((ruleId) => !linksByRuleId.has(ruleId));
              if (unresolved.length > 0) {
                const added = await knowledgeIndicatorClient.getQueryLinks(
                  next.event.stream_names,
                  {
                    ruleIds: unresolved,
                    includeExpired: true,
                  }
                );
                added.forEach((link) => linksByRuleId.set(link.rule_id, link));
              }
              applied = await evaluateSeries(next);
            }
          }

          tallyApplied(result, applied);
        } catch (error) {
          result.failed++;
          logger.error(
            `Status reconciliation failed for event ${series.event.event_id}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      })
    )
  );

  return result;
};
