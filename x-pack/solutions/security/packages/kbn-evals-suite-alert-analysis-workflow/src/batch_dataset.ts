/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Deterministic batches of labeled alerts from one rule, to measure how a model holds up at the
 * batch sizes the Alert Triage Worker really sends (up to 50 alerts per model call).
 *
 * A plan is a pure function of `(rule, size, truePositiveRatio, seed, hard)`. The number of true and
 * false positives is exact, the alerts are spread over the rule's shapes by their weights (see
 * `batch_rules.ts`), and the order is shuffled so position carries no signal. Every alert built
 * from one shape carries the same evidence and the same label; only neutral fields vary (host,
 * user, pid, generated file names), so a verdict can be judged against the label without doubt.
 */

import type { Classification } from './constants';
import { buildDoc } from './synthetic_alerts';
import { BATCH_RULES, type AlertShape, type BatchRule, type Variation } from './batch_rules';

export interface BatchPlanItem {
  expected: Classification;
  /** Id of the shape this alert comes from; same shape = same evidence = same label. */
  shape: string;
  /** True for the shapes only hard-tier batches contain. */
  hard: boolean;
  variation: Variation;
}

const USERS = ['jsmith', 'alopez', 'mchen', 'rpatel', 'kwilson', 'dnguyen', 'ebrown', 'tkowalski'];

/**
 * Small deterministic PRNG (a linear congruential generator), so a seed always yields the same
 * plan. The product stays below 2^53, so the arithmetic is exact.
 */
const createRandom = (seed: number) => {
  let state = seed % 4294967296;
  return (): number => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

/** Splits `total` over the shapes by weight, exactly (largest remainder). */
const allocate = (shapes: AlertShape[], total: number): number[] => {
  const weightSum = shapes.reduce((sum, { weight }) => sum + weight, 0);
  const exact = shapes.map(({ weight }) => (total * weight) / weightSum);
  const counts = exact.map(Math.floor);
  const byRemainder = exact
    .map((value, i) => ({ i, remainder: value - counts[i] }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  const leftover = total - counts.reduce((a, b) => a + b, 0);
  for (let k = 0; k < leftover; k++) {
    counts[byRemainder[k].i]++;
  }
  return counts;
};

export const planBatch = ({
  rule,
  size,
  truePositiveRatio = 0.2,
  seed = 1,
  hard = false,
}: {
  rule: BatchRule;
  size: number;
  truePositiveRatio?: number;
  seed?: number;
  /** Also draw from the rule's hard shapes (see `batch_rules.ts`). */
  hard?: boolean;
}): BatchPlanItem[] => {
  const random = createRandom(seed);
  const truePositives = Math.round(size * truePositiveRatio);
  const classes: Array<[Classification, number]> = [
    ['true_positive', truePositives],
    ['false_positive', size - truePositives],
  ];

  const items: BatchPlanItem[] = classes.flatMap(([expected, total]) => {
    const shapes = rule.shapes.filter(
      (shape) => shape.expected === expected && (hard || !shape.hard)
    );
    return allocate(shapes, total).flatMap((count, i) =>
      Array.from({ length: count }, () => ({
        expected,
        shape: shapes[i].id,
        hard: shapes[i].hard === true,
        variation: {
          n: 1 + Math.floor(random() * 99),
          guid: Math.floor(random() * 0xffffffff)
            .toString(16)
            .padStart(8, '0'),
          user: USERS[Math.floor(random() * USERS.length)],
          pid: 1000 + Math.floor(random() * 60000),
        },
      }))
    );
  });

  // Fisher-Yates, so true and false positives are interleaved.
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

/**
 * Turns a plan into alert documents that all belong to the rule, under `ruleId`. `runId` keeps
 * ids unique per run, so concurrent runs never see each other's alerts (the workflow's enrichment
 * queries are rule-scoped and its related-alerts lookup is entity-scoped).
 */
export const buildBatchDocs = ({
  ruleKey,
  plan,
  runId,
  ruleId,
}: {
  ruleKey: string;
  plan: BatchPlanItem[];
  runId: string;
  ruleId: string;
}): Array<{ id: string; doc: Record<string, unknown> }> => {
  const { shapes, ...rule } = BATCH_RULES[ruleKey];
  return plan.map(({ shape, variation }, index) => {
    const { observable } = shapes.find(({ id }) => id === shape) ?? {};
    if (!observable) {
      throw new Error(`No shape ${shape} in rule ${ruleKey}`);
    }
    const id = `aa-batch-${runId}-${index}`;
    return {
      id,
      doc: {
        ...buildDoc({ ...rule, id, index, observable: observable(variation) }),
        'kibana.alert.rule.uuid': ruleId,
        'kibana.alert.rule.rule_id': ruleId,
        'process.entity_id': `entity-${id}`,
        'process.pid': variation.pid,
        'host.id': `host-${id}`,
      },
    };
  });
};
