/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The model queue part of a run report: which kinds of alert the model analyzed and which kinds got no verdict, and for process
 * alerts the state of the cache record of their key. It also reads the Jev process shadow (`az:jev_shadow_*`) against the truth,
 * for the go or no-go of Jev on process alerts: Jev could only take a process alert whose key has a pending or expired record and
 * no novelty guard hit.
 */

import {
  JEV_SHADOW_GUARD_HIT_TAG,
  JEV_SHADOW_LANE_TAG_PREFIX,
  JEV_SHADOW_STATE_TAG_PREFIX,
} from '../../server/alert_triage/jev_first_line';
import { GUARD_HIT_TAG_PREFIX } from '../../server/alert_triage/novelty_guard';
import {
  TRIAGE_CACHE_AUDIT_TAG_PREFIX,
  TRIAGE_WOULD_REUSE_TAG_PREFIX,
} from '../../server/alert_triage/verdict_cache';
import { sourceOf } from './report_poc';
import type { TaggedAlert, Truth } from './report_run';

const VERDICT_TAGS: readonly string[] = [
  'az:false_positive',
  'az:true_positive',
  'az:inconclusive',
];
const LANES = ['benign', 'attack', 'middle'] as const;
type Lane = (typeof LANES)[number];

/** The states of a process key that the step 5 change would let Jev score. */
const JEV_PROCESS_STATES: readonly string[] = ['pending', 'expired'];

interface LaneCounts {
  alerts: number;
  truePositive: number;
  falsePositive: number;
}

export interface QueueSection {
  /** Alerts the model analyzed, by kind, and the process ones by key state. */
  modelQueue: {
    total: number;
    byKind: Record<string, number>;
    processByState: Record<string, number>;
  };
  /**
   * Alerts with no verdict at the end of the run, the same way, but only those with an `az:` tag: the report reads no other alert.
   * An alert that no step touched is missing here. The full count is `wait.nonBuildingBlockWithoutVerdict`.
   */
  noVerdict: {
    total: number;
    byKind: Record<string, number>;
    processByState: Record<string, number>;
  };
  /**
   * Gate of step 3: process alerts that the model analyzed and whose key has no active record, as a share of the model queue.
   * `jevProcessShare` counts only the states that step 5 lets Jev score (pending or expired, no guard hit).
   */
  gate: { processWithoutActiveShare: number | null; jevProcessShare: number | null };
  shadow: {
    scored: number;
    byState: Record<string, Record<Lane, LaneCounts>>;
    guardHits: number;
    /** The alerts step 5 would let Jev score: pending or expired key, no guard hit. */
    jevProcess: {
      alerts: number;
      lanes: Record<Lane, LaneCounts>;
      benignShare: number | null;
      /** Attacks in the benign lane, as a share of the benign lane. The criterion is at most 1%. */
      benignAttackShare: number | null;
      /** Planted variants (new hash and the others) in the benign lane, by variant. The criterion for new hash is 0. */
      benignVariants: Record<string, number>;
    };
  };
}

const share = (part: number, whole: number): number | null =>
  whole === 0 ? null : Number((part / whole).toFixed(4));

const emptyLanes = (): Record<Lane, LaneCounts> => ({
  benign: { alerts: 0, truePositive: 0, falsePositive: 0 },
  attack: { alerts: 0, truePositive: 0, falsePositive: 0 },
  middle: { alerts: 0, truePositive: 0, falsePositive: 0 },
});

const suffixOf = (tags: readonly string[], prefix: string): string | undefined =>
  tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length);

/**
 * The state of the key of a process alert as the steps saw it. An active record shows in the cache tags: the alert reached the model
 * because a guard fired or because it is in the audit sample. Otherwise the shadow tag holds the state. `not_seen`: neither.
 */
export const processStateOf = (tags: readonly string[]): string => {
  if (tags.some((tag) => tag.startsWith(TRIAGE_WOULD_REUSE_TAG_PREFIX))) {
    if (tags.some((tag) => tag.startsWith(GUARD_HIT_TAG_PREFIX))) return 'active_guard_hit';
    if (tags.some((tag) => tag.startsWith(TRIAGE_CACHE_AUDIT_TAG_PREFIX))) return 'active_audit';
    return 'active';
  }
  return suffixOf(tags, JEV_SHADOW_STATE_TAG_PREFIX) ?? 'not_seen';
};

const bump = (counts: Record<string, number>, key: string) => {
  counts[key] = (counts[key] ?? 0) + 1;
};

/** The model queue section of the report. Pure: the alerts and the truth in. */
export const buildQueueSection = ({
  alerts,
  truth,
}: {
  alerts: readonly TaggedAlert[];
  truth: Truth;
}): QueueSection => {
  const modelQueue = { total: 0, byKind: {}, processByState: {} } as QueueSection['modelQueue'];
  const noVerdict = { total: 0, byKind: {}, processByState: {} } as QueueSection['noVerdict'];
  const byState: Record<string, Record<Lane, LaneCounts>> = {};
  const jevProcess = {
    alerts: 0,
    lanes: emptyLanes(),
    benignVariants: {} as Record<string, number>,
  };
  let scored = 0;
  let guardHits = 0;
  let processWithoutActive = 0;
  let jevProcessInQueue = 0;

  for (const alert of alerts) {
    const known = truth.get(alert.id);
    if (known === undefined || alert.buildingBlock === true) continue;
    const kind = known.kind ?? 'unknown';
    const hasVerdict = alert.tags.some((tag) => VERDICT_TAGS.includes(tag));
    const state = kind === 'process' ? processStateOf(alert.tags) : undefined;
    const guardHit = alert.tags.includes(JEV_SHADOW_GUARD_HIT_TAG);

    const queue = !hasVerdict
      ? noVerdict
      : sourceOf(alert.tags) === 'model'
      ? modelQueue
      : undefined;
    if (queue !== undefined) {
      queue.total++;
      bump(queue.byKind, kind);
      if (state !== undefined) bump(queue.processByState, state);
    }
    if (queue === modelQueue && state !== undefined) {
      if (!state.startsWith('active')) processWithoutActive++;
      if (JEV_PROCESS_STATES.includes(state) && !guardHit) jevProcessInQueue++;
    }

    const lane = suffixOf(alert.tags, JEV_SHADOW_LANE_TAG_PREFIX) as Lane | undefined;
    // The shadow lane is judged by the state the shadow saw. The key can turn active later, and the cache then tags the alert too.
    const shadowState = suffixOf(alert.tags, JEV_SHADOW_STATE_TAG_PREFIX);
    if (lane === undefined || !LANES.includes(lane) || shadowState === undefined) continue;
    scored++;
    if (guardHit) guardHits++;
    const attack = known.verdict === 'true_positive';
    const count = (lanes: Record<Lane, LaneCounts>) => {
      lanes[lane].alerts++;
      if (attack) lanes[lane].truePositive++;
      else lanes[lane].falsePositive++;
    };
    byState[shadowState] ??= emptyLanes();
    count(byState[shadowState]);
    if (!JEV_PROCESS_STATES.includes(shadowState) || guardHit) continue;
    jevProcess.alerts++;
    count(jevProcess.lanes);
    if (lane === 'benign' && attack && known.variant)
      bump(jevProcess.benignVariants, known.variant);
  }

  const { benign } = jevProcess.lanes;
  return {
    modelQueue,
    noVerdict,
    gate: {
      processWithoutActiveShare: share(processWithoutActive, modelQueue.total),
      jevProcessShare: share(jevProcessInQueue, modelQueue.total),
    },
    shadow: {
      scored,
      byState,
      guardHits,
      jevProcess: {
        ...jevProcess,
        benignShare: share(benign.alerts, jevProcess.alerts),
        benignAttackShare: share(benign.truePositive, benign.alerts),
      },
    },
  };
};

/** One sentence for the Notes column of the ledger row. */
export const queueNote = ({ gate, shadow }: QueueSection): string => {
  const pct = (value: number | null) => (value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`);
  const { jevProcess } = shadow;
  return (
    `Process alerts without an active record: ${pct(
      gate.processWithoutActiveShare
    )} of the model queue ` +
    `(pending or expired, no guard hit: ${pct(gate.jevProcessShare)}). Process shadow: ${
      shadow.scored
    } scored, ` +
    `${jevProcess.alerts} that step 5 would score, benign lane ${pct(
      jevProcess.benignShare
    )} with ` +
    `${jevProcess.lanes.benign.truePositive} attacks (${pct(jevProcess.benignAttackShare)}).`
  );
};
