/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CandidateStage, StrategyCandidate } from '../../../common';
import { CANDIDATE_RUNNING_STAGES } from '../../../common';
import type { IStateStore } from '../storage/state_store';
import type { RunningDetector } from '../strategies/types';

/** Stages a candidate never leaves; their signatures block the same change from coming back. */
export const FINAL_STAGES: readonly CandidateStage[] = ['replay_failed', 'rolled_back', 'rejected'];
/** Stages that hold their scope: one change at a time per service and source. */
export const SCOPE_HOLDING_STAGES: readonly CandidateStage[] = ['trial', 'review', 'live'];

/** Moves a candidate to a stage and keeps why, so every learned change carries its evidence. */
export function advance(
  candidate: StrategyCandidate,
  stage: CandidateStage,
  note: string,
  by: 'engine' | 'person' = 'engine'
): StrategyCandidate {
  const at = new Date().toISOString();
  return {
    ...candidate,
    stage,
    updated_at: at,
    history: [...candidate.history, { at, stage, note, by }],
  };
}

export async function listCandidates(state: IStateStore): Promise<StrategyCandidate[]> {
  return state.list('candidate');
}

export async function saveCandidate(
  state: IStateStore,
  candidate: StrategyCandidate
): Promise<void> {
  await state.put('candidate', candidate, { key: candidate.candidate_id });
}

/** Detectors in trial or live, as the learned-detectors strategy runs them. */
export function runningDetectors(candidates: StrategyCandidate[]): RunningDetector[] {
  return candidates.flatMap((candidate) => {
    const mode = CANDIDATE_RUNNING_STAGES[candidate.stage];
    return candidate.kind === 'detector' && candidate.detector && mode && mode !== 'off'
      ? [{ ...candidate.detector, candidate_id: candidate.candidate_id, mode }]
      : [];
  });
}

/**
 * Threshold changes in force. A live one applies; a trial one is only replayed and compared,
 * so the baseline never changes before the change proved itself.
 */
export function activeThresholds(candidates: StrategyCandidate[]): Map<string, number> {
  return new Map(
    candidates.flatMap((candidate) =>
      candidate.kind === 'threshold' &&
      candidate.threshold &&
      CANDIDATE_RUNNING_STAGES[candidate.stage] === 'live'
        ? candidate.threshold.fingerprints.map(
            (fingerprint) => [fingerprint, candidate.threshold!.to_mad_k] as const
          )
        : []
    )
  );
}
