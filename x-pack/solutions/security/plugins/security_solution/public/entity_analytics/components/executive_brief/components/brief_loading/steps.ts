/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BriefJobStage } from '../../../../../../common/entity_analytics/executive_brief/types';

export type StepState = 'complete' | 'current' | 'upcoming';

export interface BriefLoadingStep {
  id: string;
  label: string;
  stages: readonly BriefJobStage[];
}

export const BRIEF_LOADING_STEPS: readonly BriefLoadingStep[] = [
  { id: 'collect', label: 'Collecting signals', stages: ['snapshot'] },
  { id: 'link', label: 'Linking threats', stages: ['storylines'] },
  { id: 'blind_spots', label: 'Checking blind spots', stages: ['blind_spots'] },
  { id: 'write', label: 'Writing', stages: ['generate'] },
  { id: 'verify', label: 'Verifying', stages: ['validate', 'persist'] },
];

export const STAGE_LABEL: Record<BriefJobStage, string> = {
  snapshot: 'Collecting entity, alert and detection data',
  storylines: 'Connecting entities into priority threats',
  blind_spots: 'Checking attack-stage coverage and visibility gaps',
  generate: 'Writing the brief…',
  validate: 'Checking every claim against the evidence',
  persist: 'Saving the brief',
};

export const STARTING_LABEL = 'Starting the brief';

/** Index of the step the stage belongs to; -1 before the first stage is reported. */
export const getCurrentStepIndex = (stage: BriefJobStage | undefined): number =>
  stage ? BRIEF_LOADING_STEPS.findIndex(({ stages }) => stages.includes(stage)) : -1;

export const getStepStates = (stage: BriefJobStage | undefined): StepState[] => {
  const current = getCurrentStepIndex(stage);
  return BRIEF_LOADING_STEPS.map((_, index) => {
    if (index < current) return 'complete';
    if (index === current) return 'current';
    return 'upcoming';
  });
};

export const formatElapsed = (elapsedMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export const getExpectationCopy = (isTemplate: boolean): string =>
  isTemplate ? 'usually a few seconds' : 'usually about 30 seconds';
