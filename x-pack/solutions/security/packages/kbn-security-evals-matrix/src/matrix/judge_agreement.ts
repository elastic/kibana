/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wilsonInterval, type ConfidenceInterval } from './trajectory_agreement';
import { classifyFamily } from './judge_provenance';

/**
 * One evaluator verdict, identified well enough to pair it with the verdict a
 * different judge produced for the same unit of work.
 */
export interface JudgeVerdict {
  modelId: string;
  judgeId: string;
  /** Suite that produced the verdict; keeps example ids reused across suites from pairing. */
  suiteId?: string;
  example: string;
  repetition: number;
  evaluator: string;
  score: number;
}

export type JudgeAgreementStatus = 'unmeasured' | 'single-judge' | 'measured';

export interface EvaluatorDisagreement {
  evaluator: string;
  flips: number;
  pairs: number;
  interval: ConfidenceInterval;
}

export interface JudgeAgreementRow {
  modelId: string;
  status: JudgeAgreementStatus;
  /** Judges that scored this model at all, whether or not they overlap. */
  judges: string[];
  /** Cells where two judges scored the identical example+rep+evaluator. */
  pairs: number;
  /** Cells only one of the compared judges scored. */
  unpaired: number;
  /** Pass/fail concordance, the verdict-level view. */
  verdictAgreement?: number;
  interval?: ConfidenceInterval;
  /** Directional bias: mean(judgeA) - mean(judgeB) over paired cells. */
  bias?: number;
  biasJudges?: [string, string];
  worstEvaluators: EvaluatorDisagreement[];
}

/** Cost and latency instruments are recorded as evaluators but are not verdicts. */
const NON_VERDICT_EVALUATORS = new Set(['Input Tokens', 'Output Tokens', 'Latency', 'Tool Calls']);

/** Scores are 0..1; a verdict is the pass/fail side of the midpoint. */
const passed = (score: number): boolean => score > 0.5;

const cellKey = (v: JudgeVerdict): string =>
  `${v.suiteId ?? ''}\u0000${v.example}\u0000${v.repetition}\u0000${v.evaluator}`;

/**
 * Compares the two judges with the most overlap, pairing verdicts by (example, repetition, evaluator).
 */
export const judgeAgreementForModel = (
  verdicts: readonly JudgeVerdict[],
  modelId: string
): JudgeAgreementRow => {
  const mine = verdicts.filter(
    (v) => v.modelId === modelId && !NON_VERDICT_EVALUATORS.has(v.evaluator)
  );
  const judges = [...new Set(mine.map((v) => v.judgeId))].sort();

  if (judges.length === 0) {
    return {
      modelId,
      status: 'unmeasured',
      judges: [],
      pairs: 0,
      unpaired: 0,
      worstEvaluators: [],
    };
  }
  if (judges.length === 1) {
    return {
      modelId,
      status: 'single-judge',
      judges,
      pairs: 0,
      unpaired: new Set(mine.map(cellKey)).size,
      worstEvaluators: [],
    };
  }

  let best: { a: string; b: string; keys: string[] } | undefined;
  // A "second opinion" from the same model family is not independent evidence: two
  // Anthropic (or two OpenAI) judges share training biases, so their agreement
  // measures family self-consistency, not judge reliability. Same-family pairs are
  // excluded from the selection outright.
  const crossFamilyPairs = judges
    .flatMap((a, i) => judges.slice(i + 1).map((b) => ({ a, b })))
    .filter(({ a, b }) => classifyFamily(a) !== classifyFamily(b));
  for (const { a, b } of crossFamilyPairs) {
    const aKeys = new Set(mine.filter((v) => v.judgeId === a).map(cellKey));
    const shared = [
      ...new Set(mine.filter((v) => v.judgeId === b && aKeys.has(cellKey(v))).map(cellKey)),
    ];
    if (!best || shared.length > best.keys.length) {
      best = { a, b, keys: shared };
    }
  }

  if (!best || best.keys.length === 0) {
    // Judges scored disjoint work, so no comparison is possible.
    return {
      modelId,
      status: 'single-judge',
      judges,
      pairs: 0,
      unpaired: new Set(mine.map(cellKey)).size,
      worstEvaluators: [],
    };
  }

  const scoreOf = new Map<string, { a?: number; b?: number; evaluator: string }>();
  for (const v of mine) {
    if (v.judgeId === best.a || v.judgeId === best.b) {
      const key = cellKey(v);
      const entry = scoreOf.get(key) ?? { evaluator: v.evaluator };
      if (v.judgeId === best.a) {
        entry.a = v.score;
      } else {
        entry.b = v.score;
      }
      scoreOf.set(key, entry);
    }
  }

  const paired = [...scoreOf.values()].filter(
    (e): e is { a: number; b: number; evaluator: string } => e.a !== undefined && e.b !== undefined
  );
  const unpaired = scoreOf.size - paired.length;

  let concordant = 0;
  let sumA = 0;
  let sumB = 0;
  const perEvaluator = new Map<string, { flips: number; pairs: number }>();
  for (const cell of paired) {
    const agree = passed(cell.a) === passed(cell.b);
    if (agree) {
      concordant += 1;
    }
    sumA += cell.a;
    sumB += cell.b;
    const stat = perEvaluator.get(cell.evaluator) ?? { flips: 0, pairs: 0 };
    stat.pairs += 1;
    if (!agree) {
      stat.flips += 1;
    }
    perEvaluator.set(cell.evaluator, stat);
  }

  const worstEvaluators = [...perEvaluator.entries()]
    .filter(([, s]) => s.flips > 0)
    .map(([evaluator, s]) => ({
      evaluator,
      flips: s.flips,
      pairs: s.pairs,
      interval: wilsonInterval(s.flips, s.pairs),
    }))
    .sort((x, y) => y.flips / y.pairs - x.flips / x.pairs)
    .slice(0, 5);

  return {
    modelId,
    status: 'measured',
    judges,
    pairs: paired.length,
    unpaired,
    verdictAgreement: concordant / paired.length,
    interval: wilsonInterval(concordant, paired.length),
    bias: sumA / paired.length - sumB / paired.length,
    biasJudges: [best.a, best.b],
    worstEvaluators,
  };
};
