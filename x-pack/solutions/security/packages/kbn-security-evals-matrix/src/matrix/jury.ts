/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyFamily, type ModelFamily } from './judge_provenance';

export interface JuryVote {
  judgeId: string;
  score: number;
  /** Categorical verdict, when the evaluator emits one. */
  verdict?: string;
}

export interface JuryOptions {
  /** Maximum votes counted per model family; later votes are dropped. Defaults to 1. */
  maxVotesPerFamily?: number;
  /** Minimum counted votes for the result to be decided. Defaults to 2. */
  minVotes?: number;
}

export interface JuryResult {
  /** Median of the counted votes; null when there were not enough votes. */
  score: number | null;
  /** Votes actually counted after per-family capping. */
  counted: JuryVote[];
  /** Votes discarded because their family was already at its cap. */
  dropped: JuryVote[];
  /** max - min across counted votes. 0 means unanimous. */
  disagreement: number;
  /** True when every counted vote carries the same categorical verdict. */
  verdictUnanimous: boolean;
  /** Distinct families represented among counted votes. */
  families: ModelFamily[];
  /** False when fewer than `minVotes` votes were available. */
  decided: boolean;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Aggregate a panel's votes on one cell into a median, discarding non-finite scores and capping votes per family. */
export function aggregateJury(votes: JuryVote[], options: JuryOptions = {}): JuryResult {
  const maxPerFamily = Math.max(1, options.maxVotesPerFamily ?? 1);
  const minVotes = Math.max(1, options.minVotes ?? 2);

  const usable = votes.filter((v) => Number.isFinite(v.score));
  const perFamily = new Map<ModelFamily, number>();
  const counted: JuryVote[] = [];
  const dropped: JuryVote[] = [];

  for (const vote of usable) {
    const family = classifyFamily(vote.judgeId);
    const used = perFamily.get(family) ?? 0;
    if (used < maxPerFamily) {
      perFamily.set(family, used + 1);
      counted.push(vote);
    } else {
      dropped.push(vote);
    }
  }

  if (counted.length === 0) {
    return {
      score: null,
      counted,
      dropped,
      disagreement: 0,
      verdictUnanimous: false,
      families: [],
      decided: false,
    };
  }

  const scores = counted.map((v) => v.score);
  const verdicts = counted.map((v) => v.verdict).filter((v): v is string => v !== undefined);

  return {
    score: median(scores),
    counted,
    dropped,
    disagreement: Math.max(...scores) - Math.min(...scores),
    verdictUnanimous: verdicts.length > 0 && new Set(verdicts).size === 1,
    families: [...new Set(counted.map((v) => classifyFamily(v.judgeId)))].sort(),
    decided: counted.length >= minVotes,
  };
}

/** An ordinal ladder over a judge's categorical verdict. */
export type VerdictLadder = Record<string, number>;

export const GROUNDEDNESS_LADDER: VerdictLadder = {
  GROUNDED: 1,
  GROUNDED_WITH_DISCLOSURE: 0.85,
  MINOR_HALLUCINATIONS: 0.5,
  MAJOR_HALLUCINATIONS: 0,
};

export const FACTUALITY_LADDER: VerdictLadder = {
  ACCURATE: 1,
  MINOR_INACCURACIES: 0.5,
  MAJOR_INACCURACIES: 0,
};

export const RELEVANCE_LADDER: VerdictLadder = {
  RELEVANT: 1,
  PARTIALLY_RELEVANT: 0.5,
  IRRELEVANT: 0,
};

/** Verdict ladders keyed by evaluator name; absent evaluators keep their continuous score. */
export const VERDICT_LADDERS: Record<string, VerdictLadder> = {
  Groundedness: GROUNDEDNESS_LADDER,
  Factuality: FACTUALITY_LADDER,
  Relevance: RELEVANCE_LADDER,
};

/** Map a categorical verdict onto its ordinal score, or null when the verdict is not on the ladder. */
export function scoreVerdict(
  verdict: string | undefined | null,
  ladder: VerdictLadder
): number | null {
  const key = String(verdict ?? '')
    .trim()
    .toUpperCase();
  if (!key) {
    return null;
  }
  return Object.prototype.hasOwnProperty.call(ladder, key) ? ladder[key] : null;
}
