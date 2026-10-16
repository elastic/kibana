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
import { DETECTION_STRATEGY_IDS } from '../../../common';
import type { IEngineStorage } from '../storage/engine_storage';

/** A trial strategy needs this many would-raise detections before promotion is proposed. */
const MIN_TRIAL_EVIDENCE = 1;
/** A live strategy whose events are dismissed this often is proposed back to trial. */
const DISMISSAL_RATE_FOR_ROLLBACK = 0.5;
const MIN_EVENTS_FOR_ROLLBACK = 5;
const MAX_MEMORY_NOTES = 10;

/** Scores each strategy from what it actually did, read as aggregations. */
export async function scoreStrategies(
  storage: IEngineStorage
): Promise<Record<DetectionStrategyId, StrategyScorecard>> {
  const [detections, events, verifierFailures] = await Promise.all([
    storage.records.detectionCounts(),
    storage.events.strategyStats(),
    storage.records.verifierFailures(),
  ]);
  return Object.fromEntries(
    DETECTION_STRATEGY_IDS.map((strategy) => [
      strategy,
      {
        strategy,
        detections: detections[strategy]?.detections ?? 0,
        above_normal: detections[strategy]?.above_normal ?? 0,
        would_raise_in_trial: detections[strategy]?.would_raise_in_trial ?? 0,
        events_opened: events[strategy]?.opened ?? 0,
        events_dismissed: events[strategy]?.dismissed ?? 0,
        verifier_failures: verifierFailures.get(strategy) ?? 0,
      },
    ])
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
  storage: IEngineStorage;
  event: EngineEvent;
  reason: string;
  note?: string;
}): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const existing = await storage.state.getMany(
    'memory',
    event.members.map((member) => member.fingerprint)
  );
  await Promise.all(
    event.members.map((member) => {
      const entry = `${day}: an event with "${member.title}" was dismissed as ${reason}${
        note ? ` ("${note}")` : ''
      } at value ${member.value} ${member.unit}.`;
      return storage.state.put(
        'memory',
        {
          fingerprint: member.fingerprint,
          notes: [entry, ...(existing.get(member.fingerprint)?.notes ?? [])].slice(
            0,
            MAX_MEMORY_NOTES
          ),
        },
        { key: member.fingerprint }
      );
    })
  );
}
