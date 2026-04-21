/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toHighPrecision } from '../../utils/number';
import { computeSummaryStatus } from './compute_summary_status';
import { toErrorBudget } from './error_budget';
import type { ErrorBudget, Objective, Status } from '../models';

export const NO_DATA = -1;

export interface WeightedDataPoint {
  weight: number;
  sliValue: number;
}

export interface WeightedSliResult {
  sliValue: number;
  errorBudget: ErrorBudget;
  status: Status;
}

export function computeWeightedSli(
  dataPoints: WeightedDataPoint[],
  objective: Objective
): WeightedSliResult {
  let totalWeight = 0;
  let weightedSli = 0;
  let hasData = false;

  for (const { weight, sliValue } of dataPoints) {
    if (sliValue === NO_DATA) {
      continue;
    }
    hasData = true;
    totalWeight += weight;
    weightedSli += weight * sliValue;
  }

  if (!hasData || totalWeight === 0) {
    return {
      sliValue: NO_DATA,
      errorBudget: toErrorBudget(0, 0),
      status: 'NO_DATA',
    };
  }

  const sliValue = toHighPrecision(weightedSli / totalWeight);
  const initialErrorBudget = 1 - objective.target;
  const consumedErrorBudget =
    sliValue < 0 || initialErrorBudget <= 0 ? 0 : (1 - sliValue) / initialErrorBudget;
  const errorBudget = toErrorBudget(initialErrorBudget, consumedErrorBudget);
  const status = computeSummaryStatus(objective, sliValue, errorBudget);

  return { sliValue, errorBudget, status };
}

export function computeNormalisedWeights(dataPoints: WeightedDataPoint[]): number[] {
  const totalWeight = dataPoints
    .filter(({ sliValue }) => sliValue !== NO_DATA)
    .reduce((sum, { weight }) => sum + weight, 0);

  if (totalWeight === 0) {
    return dataPoints.map(() => 0);
  }

  return dataPoints.map(({ weight, sliValue }) =>
    sliValue === NO_DATA ? 0 : toHighPrecision(weight / totalWeight)
  );
}
