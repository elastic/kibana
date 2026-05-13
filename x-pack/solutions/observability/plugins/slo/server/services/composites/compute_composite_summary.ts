/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompositeSLOMemberSummary, CompositeSLOSummary, SLOStatus } from '@kbn/slo-schema';
import {
  computeNormalisedWeights,
  computeWeightedSli,
  NO_DATA,
  toErrorBudget,
} from '../../domain/services';
import { toHighPrecision } from '../../utils/number';
import type { CompositeSLODefinition } from '../../domain/models';
import type { BurnRateWindow } from '../summary_client';

export interface MemberSummaryData {
  member: { sloId: string; weight: number; instanceId?: string };
  sloName: string;
  summary: {
    sliValue: number;
    status: SLOStatus;
    fiveMinuteBurnRate: number;
    oneHourBurnRate: number;
    oneDayBurnRate: number;
  };
  burnRateWindows: BurnRateWindow[];
}

export function computeCompositeSummary(
  compositeSlo: CompositeSLODefinition,
  memberSummaries: MemberSummaryData[]
): { compositeSummary: CompositeSLOSummary; members: CompositeSLOMemberSummary[] } {
  const sliDataPoints = memberSummaries.map((ms) => ({
    weight: ms.member.weight,
    sliValue: ms.summary.sliValue,
  }));

  const { sliValue, errorBudget, status } = computeWeightedSli(
    sliDataPoints,
    compositeSlo.objective
  );

  if (status === 'NO_DATA') {
    return {
      compositeSummary: buildNoDataSummary(),
      members: memberSummaries.map((ms) => buildMemberSummary(ms, 0)),
    };
  }

  const normalisedWeights = computeNormalisedWeights(sliDataPoints);

  const fiveMinResult = computeWeightedSli(
    memberSummaries.map((ms) => ({
      weight: ms.member.weight,
      sliValue: getWindowSli(ms.burnRateWindows, '5m'),
    })),
    compositeSlo.objective
  );
  const oneHourResult = computeWeightedSli(
    memberSummaries.map((ms) => ({
      weight: ms.member.weight,
      sliValue: getWindowSli(ms.burnRateWindows, '1h'),
    })),
    compositeSlo.objective
  );
  const oneDayResult = computeWeightedSli(
    memberSummaries.map((ms) => ({
      weight: ms.member.weight,
      sliValue: getWindowSli(ms.burnRateWindows, '1d'),
    })),
    compositeSlo.objective
  );

  const compositeErrorBudget = 1 - compositeSlo.objective.target;

  const members = memberSummaries.map((ms, i) => buildMemberSummary(ms, normalisedWeights[i]));

  return {
    compositeSummary: {
      sliValue,
      errorBudget,
      status,
      fiveMinuteBurnRate: deriveBurnRate(fiveMinResult.sliValue, compositeErrorBudget),
      oneHourBurnRate: deriveBurnRate(oneHourResult.sliValue, compositeErrorBudget),
      oneDayBurnRate: deriveBurnRate(oneDayResult.sliValue, compositeErrorBudget),
    },
    members,
  };
}

function buildMemberSummary(
  ms: {
    member: { sloId: string; weight: number; instanceId?: string };
    sloName: string;
    summary: { sliValue: number; status: SLOStatus };
  },
  normalisedWeight: number
): CompositeSLOMemberSummary {
  const { sliValue } = ms.summary;
  const contribution = sliValue === NO_DATA ? 0 : toHighPrecision(normalisedWeight * sliValue);

  return {
    id: ms.member.sloId,
    name: ms.sloName,
    weight: ms.member.weight,
    normalisedWeight,
    sliValue,
    status: ms.summary.status,
    contribution,
    ...(ms.member.instanceId !== undefined ? { instanceId: ms.member.instanceId } : {}),
  };
}

export function buildNoDataSummary(): CompositeSLOSummary {
  return {
    sliValue: NO_DATA,
    errorBudget: toErrorBudget(0, 0),
    status: 'NO_DATA',
    fiveMinuteBurnRate: 0,
    oneHourBurnRate: 0,
    oneDayBurnRate: 0,
  };
}

function getWindowSli(windows: BurnRateWindow[], name: string): number {
  return windows.find((w) => w.name === name)?.sli ?? NO_DATA;
}

function deriveBurnRate(compositeSli: number, compositeErrorBudget: number): number {
  if (compositeSli === NO_DATA || compositeSli >= 1 || compositeErrorBudget <= 0) {
    return 0;
  }
  return toHighPrecision((1 - compositeSli) / compositeErrorBudget);
}
