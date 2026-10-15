/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DetectionStrategyId,
  EngineConfig,
  EngineDetection,
  EngineEvent,
  StrategyProposal,
  StrategyScorecard,
} from '../../../common/detection_engine/types';
import { DETECTION_STRATEGY_IDS } from '../../../common/detection_engine/types';
import type { EngineStorage } from './storage';

/** A trial strategy needs this many would-raise detections before promotion is proposed. */
const MIN_TRIAL_EVIDENCE = 1;
/** A live strategy whose events are dismissed this often is proposed back to trial. */
const DISMISSAL_RATE_FOR_ROLLBACK = 0.5;
const MIN_EVENTS_FOR_ROLLBACK = 5;
const MAX_MEMORY_NOTES = 10;

/** Scores each strategy from what it actually did. */
export function scoreStrategies({
  detections,
  events,
  verifierFailures,
}: {
  detections: EngineDetection[];
  events: EngineEvent[];
  verifierFailures: Map<string, number>;
}): Record<DetectionStrategyId, StrategyScorecard> {
  return Object.fromEntries(
    DETECTION_STRATEGY_IDS.map((strategy) => {
      const own = detections.filter((detection) => detection.strategy === strategy);
      const opened = events.filter((event) => event.origin_strategy === strategy);
      return [
        strategy,
        {
          strategy,
          detections: own.length,
          above_normal: own.filter((detection) =>
            ['above_normal', 'skipped'].includes(detection.baseline.decision)
          ).length,
          would_raise_in_trial: own.filter((detection) => detection.outcome === 'trial_would_raise')
            .length,
          events_opened: opened.length,
          events_dismissed: opened.filter((event) => event.close_reason === 'dismissed').length,
          verifier_failures: opened.reduce(
            (sum, event) => sum + (verifierFailures.get(event.event_id) ?? 0),
            0
          ),
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
 * Turns a dismissal into memory notes the agent reads next time. The notes only inform the AI;
 * code never reads them to decide anything.
 */
export async function rememberDismissal({
  storage,
  event,
  reason,
  note,
}: {
  storage: EngineStorage;
  event: EngineEvent;
  reason: string;
  note?: string;
}): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  await Promise.all(
    event.members.map(async (member) => {
      const existing = await storage.getState('memory', member.fingerprint);
      const entry = `${day}: an event with "${member.title}" was dismissed as ${reason}${
        note ? ` ("${note}")` : ''
      } at value ${member.value} ${member.unit}.`;
      await storage.putState(
        'memory',
        {
          fingerprint: member.fingerprint,
          notes: [entry, ...(existing?.notes ?? [])].slice(0, MAX_MEMORY_NOTES),
        },
        member.fingerprint
      );
    })
  );
}
