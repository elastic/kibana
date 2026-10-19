/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DetectionStrategyId,
  EngineConfig,
  EngineEvent,
  StrategyProposal,
  StrategyScorecard,
} from '../../../common';
import { DAY_MS, DETECTION_STRATEGY_IDS } from '../../../common';
import type { IEngineStorage } from '../storage/engine_storage';
import { listIncidents } from './incidents';
import { createMemory, kiIdOf, type NewMemoryNote } from './memory';

/** A trial strategy needs this many would-raise detections before promotion is proposed. */
const MIN_TRIAL_EVIDENCE = 1;
/** A live strategy whose events are dismissed this often is proposed back to trial. */
const DISMISSAL_RATE_FOR_ROLLBACK = 0.5;
const MIN_EVENTS_FOR_ROLLBACK = 5;

/** Reward weights: an incident caught or missed matters most, noise and wrong calls cost less. */
const SCORE_WEIGHTS = { caught: 10, missed: 10, dismissed: 3, verifierFailure: 2 } as const;

function median(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/**
 * Scores each strategy from what it actually did and what people and the Verifier said about
 * it. The score is the learning loop's reward: incidents caught, minus incidents missed on
 * services it watches, minus dismissed events and conclusions that did not hold.
 */
export async function scoreStrategies(
  storage: IEngineStorage
): Promise<Record<DetectionStrategyId, StrategyScorecard>> {
  const [detections, events, verifierFailures, incidents, watched] = await Promise.all([
    storage.records.detectionCounts(),
    storage.events.strategyStats(),
    storage.records.verifierFailures(),
    listIncidents(storage.state),
    storage.records.serviceActivity(new Date(Date.now() - DAY_MS).toISOString()),
  ]);
  const watchedBy = (strategy: DetectionStrategyId) =>
    new Set(
      watched
        .filter((item) => item.strategies.some((entry) => entry.strategy === strategy))
        .map((item) => item.service)
    );
  return Object.fromEntries(
    DETECTION_STRATEGY_IDS.map((strategy) => {
      const caught = incidents.filter(
        (incident) => incident.label === 'confirmed' && incident.strategies.includes(strategy)
      );
      const services = watchedBy(strategy);
      const missed = incidents.filter(
        (incident) =>
          incident.label === 'missed' && incident.services.some((service) => services.has(service))
      ).length;
      const dismissed = events[strategy]?.dismissed ?? 0;
      const failures = verifierFailures.get(strategy) ?? 0;
      return [
        strategy,
        {
          strategy,
          detections: detections[strategy]?.detections ?? 0,
          above_normal: detections[strategy]?.above_normal ?? 0,
          would_raise_in_trial: detections[strategy]?.would_raise_in_trial ?? 0,
          events_opened: events[strategy]?.opened ?? 0,
          events_dismissed: dismissed,
          verifier_failures: failures,
          incidents_caught: caught.length,
          incidents_missed: missed,
          median_warning_minutes: median(
            caught.flatMap((incident) =>
              incident.warning_minutes === undefined ? [] : [incident.warning_minutes]
            )
          ),
          score:
            caught.length * SCORE_WEIGHTS.caught -
            missed * SCORE_WEIGHTS.missed -
            dismissed * SCORE_WEIGHTS.dismissed -
            failures * SCORE_WEIGHTS.verifierFailure,
        },
      ];
    })
  ) as Record<DetectionStrategyId, StrategyScorecard>;
}

/**
 * Stage two of the evolution path: the engine proposes, a person approves. Proposals touch only
 * engine-owned settings; nothing here changes a customer's rules or KIs.
 */
export function proposeStrategyChanges({
  config,
  scorecards,
}: {
  config: EngineConfig;
  scorecards: Record<DetectionStrategyId, StrategyScorecard>;
}): StrategyProposal[] {
  return DETECTION_STRATEGY_IDS.flatMap((strategy): StrategyProposal[] => {
    const mode = config.strategies[strategy].mode;
    const score = scorecards[strategy];
    if (mode === 'trial' && score.would_raise_in_trial >= MIN_TRIAL_EVIDENCE) {
      return [
        {
          id: `${strategy}:promote`,
          strategy,
          change: { mode: 'live' },
          title: 'Turn on with its daily cap',
          evidence: `In trial it would have raised ${score.would_raise_in_trial} detection(s) past the baseline check. Going live keeps the daily cap of ${config.strategies[strategy].daily_cap} new events.`,
        },
      ];
    }
    if (
      mode === 'live' &&
      score.events_opened >= MIN_EVENTS_FOR_ROLLBACK &&
      score.events_dismissed / score.events_opened >= DISMISSAL_RATE_FOR_ROLLBACK
    ) {
      return [
        {
          id: `${strategy}:rollback`,
          strategy,
          change: { mode: 'trial' },
          title: 'Move back to trial',
          evidence: `${score.events_dismissed} of ${score.events_opened} events it opened were dismissed.`,
        },
      ];
    }
    return [];
  });
}

/**
 * Turns a dismissal into memory notes the agent reads next time: on each series, on the KI a
 * series counts (a harmless match), and on the service. The notes only inform the AI; code never
 * reads them to decide anything.
 */
export async function rememberDismissal({
  storage,
  event,
  reason,
  note,
}: {
  storage: IEngineStorage;
  event: EngineEvent;
  reason: string;
  note?: string;
}): Promise<number> {
  const day = new Date().toISOString().slice(0, 10);
  const evidence = `dismissal of event ${event.event_id} on ${day}`;
  const why = `dismissed as ${reason}${note ? ` ("${note}")` : ''}`;
  return createMemory(storage.state).add([
    ...event.members.map(
      (member): NewMemoryNote => ({
        scope: 'series',
        key: member.fingerprint,
        kind: 'dismissal',
        text: `${day}: "${member.title}" at ${member.value} ${member.unit} was ${why}.`,
        evidence,
      })
    ),
    ...event.members.flatMap((member): NewMemoryNote[] => {
      const kiId = kiIdOf(member.fingerprint);
      return kiId
        ? [
            {
              scope: 'ki',
              key: kiId,
              kind: 'harmless_match',
              text: `${day}: matches of this KI on ${member.service} were ${why}.`,
              evidence,
            },
          ]
        : [];
    }),
    ...event.services.map(
      (service): NewMemoryNote => ({
        scope: 'service',
        key: service,
        kind: 'dismissal',
        text: `${day}: "${event.title}" on ${service} was ${why}.`,
        evidence,
      })
    ),
  ]);
}

/** Turns a confirmation into notes on what the problem looked like, for the next case. */
export async function rememberConfirmation({
  storage,
  event,
  note,
}: {
  storage: IEngineStorage;
  event: EngineEvent;
  note?: string;
}): Promise<number> {
  const day = new Date().toISOString().slice(0, 10);
  const evidence = `confirmation of event ${event.event_id} on ${day}`;
  const what = `${day}: a person confirmed "${event.title}" (${event.severity}) as a real problem${
    note ? `: ${note}` : ''
  }.`;
  return createMemory(storage.state).add([
    ...event.members.map(
      (member): NewMemoryNote => ({
        scope: 'series',
        key: member.fingerprint,
        kind: 'confirmed',
        text: `${what} This series peaked at ${member.peak_value} ${member.unit}.`,
        evidence,
      })
    ),
    ...event.services.map(
      (service): NewMemoryNote => ({
        scope: 'service',
        key: service,
        kind: 'confirmed',
        text: what,
        evidence,
      })
    ),
  ]);
}
