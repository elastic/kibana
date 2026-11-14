/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Random } from './prng';
import { createRandom, randomInt, shuffleInPlace } from './prng';
import type {
  AlertLabel,
  BurstPlanOptions,
  CommonPlanOptions,
  LoadPlan,
  PlannedAlert,
  PlannedBatch,
  SustainedPlanOptions,
} from './types';

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Labels exactly `round(total * fpRate)` alerts as false positive, so the realised rate matches the
 * requested one regardless of how small the run is.
 */
const buildLabels = (total: number, fpRate: number, random: Random): AlertLabel[] => {
  const falsePositives = Math.round(total * fpRate);
  const labels: AlertLabel[] = [
    ...Array<AlertLabel>(falsePositives).fill('false_positive'),
    ...Array<AlertLabel>(total - falsePositives).fill('true_positive'),
  ];
  return shuffleInPlace(labels, random);
};

const toPlannedAlerts = (
  labels: AlertLabel[],
  { templateCounts }: CommonPlanOptions,
  random: Random
): PlannedAlert[] =>
  labels.map((label) => ({
    label,
    templateIndex: randomInt(
      random,
      label === 'false_positive' ? templateCounts.falsePositives : templateCounts.truePositives
    ),
  }));

const validateCommon = ({ ruleCount, fpRate, templateCounts }: CommonPlanOptions): void => {
  if (!Number.isInteger(ruleCount) || ruleCount < 1) {
    throw new Error(`rules must be a positive integer, got ${ruleCount}`);
  }
  if (!(fpRate >= 0 && fpRate <= 1)) {
    throw new Error(`fp-rate must be between 0 and 1, got ${fpRate}`);
  }
  if (fpRate > 0 && templateCounts.falsePositives === 0) {
    throw new Error('fp-rate > 0 but the template pool has no false-positive alerts');
  }
  if (fpRate < 1 && templateCounts.truePositives === 0) {
    throw new Error('fp-rate < 1 but the template pool has no true-positive alerts');
  }
};

const finalizePlan = (
  options: CommonPlanOptions,
  batches: Array<Omit<PlannedBatch, 'batchId'>>
): LoadPlan => {
  const ordered = [...batches]
    .sort((a, b) => a.dispatchOffsetMs - b.dispatchOffsetMs || a.ruleIndex - b.ruleIndex)
    .map((batch, index) => ({
      ...batch,
      batchId: `batch-${String(index + 1).padStart(4, '0')}`,
    }));
  const allAlerts = ordered.flatMap(({ alerts }) => alerts);

  return {
    seed: options.seed,
    ruleCount: options.ruleCount,
    batches: ordered,
    totalAlerts: allAlerts.length,
    falsePositiveAlerts: allAlerts.filter(({ label }) => label === 'false_positive').length,
    lastDispatchOffsetMs: ordered.reduce(
      (max, { dispatchOffsetMs }) => Math.max(max, dispatchOffsetMs),
      0
    ),
  };
};

/**
 * `batchCount` batches of `batchSize` alerts, all dispatched at once and spread over the rules
 * round-robin. Covers the single-batch scenarios (100 / 500 / 1000 alerts in one run).
 */
export const buildBurstPlan = (options: BurstPlanOptions): LoadPlan => {
  validateCommon(options);
  const { seed, batchCount, batchSize, ruleCount } = options;
  if (!Number.isInteger(batchCount) || batchCount < 1) {
    throw new Error(`batches must be a positive integer, got ${batchCount}`);
  }
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error(`batch-size must be a positive integer, got ${batchSize}`);
  }

  const random = createRandom(seed);
  const labels = buildLabels(batchCount * batchSize, options.fpRate, random);
  const alerts = toPlannedAlerts(labels, options, random);

  const batches = Array.from({ length: batchCount }, (_, index) => ({
    ruleIndex: index % ruleCount,
    dispatchOffsetMs: 0,
    alerts: alerts.slice(index * batchSize, (index + 1) * batchSize),
  }));

  return finalizePlan(options, batches);
};

const buildRuleWeights = (ruleCount: number, skew: number): number[] =>
  Array.from({ length: ruleCount }, (_, index) => 1 / Math.pow(index + 1, skew));

const pickWeighted = (weights: number[], total: number, random: Random): number => {
  let target = random() * total;
  for (let index = 0; index < weights.length; index++) {
    target -= weights[index];
    if (target < 0) return index;
  }
  return weights.length - 1;
};

/**
 * Alerts arrive uniformly over the run (a Poisson process conditioned on its total), are assigned
 * to a rule, and are held until that rule's next execution, which is when a real rule would hand
 * them to the Worker as one batch. Every rule runs on `ruleIntervalMs` with a random phase, and a
 * batch above `maxBatchSize` is split.
 */
export const buildSustainedPlan = (options: SustainedPlanOptions): LoadPlan => {
  validateCommon(options);
  const { seed, ruleCount, alertsPerHour, durationMs, ruleIntervalMs, maxBatchSize, ruleSkew } =
    options;
  if (!(alertsPerHour > 0))
    throw new Error(`alerts-per-hour must be positive, got ${alertsPerHour}`);
  if (!(durationMs > 0)) throw new Error(`duration must be positive, got ${durationMs}ms`);
  if (!(ruleIntervalMs > 0))
    throw new Error(`rule-interval must be positive, got ${ruleIntervalMs}ms`);
  if (!Number.isInteger(maxBatchSize) || maxBatchSize < 1) {
    throw new Error(`max-batch-size must be a positive integer, got ${maxBatchSize}`);
  }
  if (!(ruleSkew >= 0)) throw new Error(`rule-skew must be >= 0, got ${ruleSkew}`);

  const random = createRandom(seed);
  const totalAlerts = Math.max(1, Math.round((alertsPerHour * durationMs) / MS_PER_HOUR));
  const labels = buildLabels(totalAlerts, options.fpRate, random);
  const alerts = toPlannedAlerts(labels, options, random);

  const weights = buildRuleWeights(ruleCount, ruleSkew);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const phases = Array.from({ length: ruleCount }, () => Math.floor(random() * ruleIntervalMs));

  const slots = new Map<
    string,
    { ruleIndex: number; dispatchOffsetMs: number; alerts: PlannedAlert[] }
  >();
  for (const alert of alerts) {
    const arrivalMs = random() * durationMs;
    const ruleIndex = pickWeighted(weights, weightTotal, random);
    const phase = phases[ruleIndex];
    const execution = Math.max(0, Math.ceil((arrivalMs - phase) / ruleIntervalMs));
    const key = `${ruleIndex}:${execution}`;
    const slot = slots.get(key) ?? {
      ruleIndex,
      dispatchOffsetMs: phase + execution * ruleIntervalMs,
      alerts: [],
    };
    slot.alerts.push(alert);
    slots.set(key, slot);
  }

  const batches: Array<Omit<PlannedBatch, 'batchId'>> = [];
  for (const { ruleIndex, dispatchOffsetMs, alerts: slotAlerts } of slots.values()) {
    for (let from = 0; from < slotAlerts.length; from += maxBatchSize) {
      batches.push({
        ruleIndex,
        dispatchOffsetMs,
        alerts: slotAlerts.slice(from, from + maxBatchSize),
      });
    }
  }

  return finalizePlan(options, batches);
};
