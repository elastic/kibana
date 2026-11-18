/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * DESIGN PROTOTYPE, NOT FOR MERGE.
 *
 * Mock data for the baseline prototype. The judgements are real answers from the TypeSafe Jev
 * decision model (QA, 5 Nov 2026), captured on synthetic alerts; here they are handed out to the
 * flyout's alerts by a hash of the alert id, so the look is realistic but the judgement of any
 * one alert is NOT real. The typical score is a deterministic offset from the current score.
 */

/** Probabilities of routine, somewhat unusual and very unusual. */
export type JudgementProbabilities = readonly [number, number, number];

export interface Judgement {
  probabilities: JudgementProbabilities;
  confidence: number;
}

export const JUDGEMENT_LABELS = ['Routine', 'Somewhat unusual', 'Very unusual'] as const;

/** Model confidence below this shows an "Unclear" flag. A placeholder threshold, not a finding. */
export const UNCLEAR_CONFIDENCE_BELOW = 0.5;

const j = (probabilities: JudgementProbabilities, confidence: number): Judgement => ({
  probabilities,
  confidence,
});

/** Captured answers, one per synthetic alert of the experiment's 24-alert set. */
export const CAPTURED_JUDGEMENTS: readonly Judgement[] = [
  j([0.68, 0.31, 0.01], 0.5),
  j([0.98, 0.02, 0], 0.97),
  j([0.11, 0.79, 0.1], 0.68),
  j([0.01, 0.61, 0.38], 0.41),
  j([0, 0.05, 0.95], 0.92),
  j([0, 0.01, 0.99], 0.98),
  j([1, 0, 0], 1),
  j([0.01, 0.83, 0.16], 0.74),
  j([1, 0, 0], 1),
  j([0, 0.03, 0.97], 0.96),
  j([0, 0.79, 0.21], 0.68),
  j([0, 0.01, 0.99], 0.98),
  j([0.9, 0.1, 0], 0.85),
  j([1, 0, 0], 1),
  j([0, 0.01, 0.99], 0.98),
  j([0, 0.06, 0.94], 0.91),
  j([0, 0.22, 0.78], 0.67),
  j([0, 0, 1], 1),
  j([0.81, 0.18, 0.01], 0.7),
  j([1, 0, 0], 1),
  j([0, 0.33, 0.67], 0.5),
  j([0.01, 0.34, 0.65], 0.46),
  j([0.01, 0.44, 0.55], 0.31),
  j([0.26, 0.72, 0.02], 0.58),
];

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) % 4294967296;
  }
  return hash;
};

/** The judgement shown for an alert: always the same one for the same alert id. */
export const getMockJudgement = (alertId: string): Judgement =>
  CAPTURED_JUDGEMENTS[hashString(alertId) % CAPTURED_JUDGEMENTS.length];

/** The index of the most likely bucket: 0 routine, 1 somewhat unusual, 2 very unusual. */
export const getJudgementBucket = ({ probabilities }: Judgement): 0 | 1 | 2 => {
  const [routine, somewhat, very] = probabilities;
  if (routine >= somewhat && routine >= very) return 0;
  return somewhat >= very ? 1 : 2;
};

export const isUnclear = ({ confidence }: Judgement): boolean =>
  confidence < UNCLEAR_CONFIDENCE_BELOW;

/**
 * The made-up stories an entity can have, so any filtered list of entities mixes them. The offset
 * is the current score minus the typical score: positive means higher than usual.
 */
const MOCK_STORIES = [
  /** 25%: well above its usual level, the kind worth a look. */
  { name: 'escalating', share: 5, min: 20, max: 45 },
  /** 35%: a high score that is normal for this entity. */
  { name: 'steady', share: 7, min: 0.5, max: 3.5 },
  /** 20%: creeping up. */
  { name: 'rising', share: 4, min: 6, max: 15 },
  /** 20%: below its usual level. */
  { name: 'cooling', share: 4, min: -25, max: -8 },
] as const;
const MOCK_STORY_SLOTS = MOCK_STORIES.reduce((sum, { share }) => sum + share, 0);

/** A repeatable 0 to 1 number for an entity, so a row shows the same value on every load. */
const getMockUnit = (entityId: string): number =>
  (Math.floor(hashString(entityId) / MOCK_STORY_SLOTS) % 1000) / 999;

/** The offset (current minus typical) of an entity: always the same for the same id. */
export const getMockOffset = (entityId: string): number => {
  let slot = hashString(entityId) % MOCK_STORY_SLOTS;
  const story = MOCK_STORIES.find(({ share }) => {
    slot -= share;
    return slot < 0;
  });
  const { min, max, name } = story ?? MOCK_STORIES[1];
  const unit = getMockUnit(entityId);
  // A steady entity sits a little above or below its usual level, never exactly on it.
  const sign = name === 'steady' && unit < 0.5 ? -1 : 1;
  return sign * (min + unit * (max - min));
};

/** The lowest typical score a mock shows, so a low-scoring entity does not read "vs 0.00". */
const MOCK_TYPICAL_FLOOR = 8;

/**
 * A made-up typical score for an entity: its current score minus its story's offset, kept within
 * the 0 to 100 score range and off the floor.
 */
export const getMockTypicalScore = (entityId: string, currentScore: number): number =>
  Math.min(
    100,
    Math.max(
      Math.min(MOCK_TYPICAL_FLOOR, currentScore),
      Number((currentScore - getMockOffset(entityId)).toFixed(2))
    )
  );
