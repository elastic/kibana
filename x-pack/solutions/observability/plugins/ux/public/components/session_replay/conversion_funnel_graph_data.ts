/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunnelStepStats } from '../../../common/session_funnel';

export interface FunnelFlowStage {
  key: string;
  label: string;
  previousLabel: string | null;
  count: number;
  conversionFromStart: number;
  conversionFromPrevious: number;
  dropOffCount: number;
  dropOffRate: number;
  sampleDroppedSessionIds: string[];
}

export const formatFunnelPercent = (ratio: number): string => `${Math.round(ratio * 1000) / 10}%`;

export const hasFunnelDropOff = (steps: FunnelStepStats[]): boolean =>
  steps.some((step) => step.dropOffCount > 0);

export const formatFunnelCount = (value: number): string => {
  if (value >= 1_000_000) {
    return `${Math.round(value / 100_000) / 10}M`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 100) / 10}K`;
  }
  return String(Math.round(value));
};

export const funnelNiceMax = (value: number): number => {
  if (value <= 0) {
    return 1;
  }
  const exp = 10 ** Math.floor(Math.log10(value));
  const scaled = value / exp;
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return nice * exp;
};

/** Top-aligned flow: remaining at this step plus drop-off from the previous. */
export const toFunnelFlowStages = (steps: FunnelStepStats[]): FunnelFlowStage[] | null => {
  if (steps.length === 0 || steps[0].count <= 0) {
    return null;
  }
  return steps.map((step, index) => ({
    key: `${step.type}:${step.value}:${index}`,
    label: step.label,
    previousLabel: index === 0 ? null : steps[index - 1].label,
    count: Math.max(0, step.count),
    conversionFromStart: step.conversionFromStart,
    conversionFromPrevious: step.conversionFromPrevious,
    dropOffCount: index === 0 ? 0 : step.dropOffCount,
    dropOffRate:
      index === 0 || steps[index - 1].count <= 0 ? 0 : step.dropOffCount / steps[index - 1].count,
    sampleDroppedSessionIds: index === 0 ? [] : step.sampleDroppedSessionIds,
  }));
};

/** Area hanging from the top axis, curving between two conversion bar bottoms. */
export const funnelFlowAreaPath = (
  x0: number,
  yBottom0: number,
  x1: number,
  yBottom1: number,
  yTop: number
): string => {
  const mid = (x0 + x1) / 2;
  return `M${x0},${yTop} L${x1},${yTop} L${x1},${yBottom1} C${mid},${yBottom1} ${mid},${yBottom0} ${x0},${yBottom0} Z`;
};
