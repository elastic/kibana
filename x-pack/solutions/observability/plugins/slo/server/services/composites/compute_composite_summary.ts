/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALL_VALUE,
  type CompositeSLOMemberWithSummary,
  type CompositeSLOSummary,
} from '@kbn/slo-schema';
import {
  computeNormalisedWeights,
  computeWeightedSli,
  NO_DATA,
  toErrorBudget,
} from '../../domain/services';
import { toHighPrecision } from '../../utils/number';
import {
  toRichRollingTimeWindow,
  type CompositeSLODefinition,
  type Summary,
} from '../../domain/models';
import type { BurnRateWindow, SummaryClient } from '../summary_client';
import type { SLODefinitionRepository } from '../slo_definition_repository';

export interface MemberSummaryData {
  member: { sloId: string; weight: number; instanceId?: string };
  sloName: string;
  summary: Pick<
    Summary,
    | 'sliValue'
    | 'status'
    | 'errorBudget'
    | 'fiveMinuteBurnRate'
    | 'oneHourBurnRate'
    | 'oneDayBurnRate'
  >;
  burnRateWindows: BurnRateWindow[];
}

interface Dependencies {
  summaryClient: SummaryClient;
  repository: SLODefinitionRepository;
}

export function computeCompositeSummary(
  compositeSlo: CompositeSLODefinition,
  memberSummaries: MemberSummaryData[]
): { compositeSummary: CompositeSLOSummary; members: CompositeSLOMemberWithSummary[] } {
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
  ms: MemberSummaryData,
  normalisedWeight: number
): CompositeSLOMemberWithSummary {
  const { sliValue } = ms.summary;

  return {
    sloId: ms.member.sloId,
    name: ms.sloName,
    weight: ms.member.weight,
    normalisedWeight,
    sliValue,
    status: ms.summary.status,
    errorBudget: ms.summary.errorBudget,
    fiveMinuteBurnRate: ms.summary.fiveMinuteBurnRate,
    oneHourBurnRate: ms.summary.oneHourBurnRate,
    oneDayBurnRate: ms.summary.oneDayBurnRate,
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

async function computeMemberSummaries(
  compositeSlo: CompositeSLODefinition,
  { repository, summaryClient }: Dependencies
): Promise<{
  memberSummaries: MemberSummaryData[];
  unresolvedMemberIds: string[];
}> {
  const memberSloIds = compositeSlo.members.map((m) => m.sloId);
  const memberDefinitions = await repository.findAllByIds(memberSloIds);
  const memberDefinitionMap = new Map(memberDefinitions.map((slo) => [slo.id, slo]));

  const activeMembers = compositeSlo.members.filter((m) => memberDefinitionMap.has(m.sloId));

  const richTimeWindow = toRichRollingTimeWindow(compositeSlo.timeWindow);

  const summaryParams = activeMembers.map((member) => ({
    slo: memberDefinitionMap.get(member.sloId)!,
    instanceId: member.instanceId ?? ALL_VALUE,
    timeWindowOverride: richTimeWindow,
  }));

  const summaryResults = await summaryClient.computeSummaries(summaryParams);

  const memberSummaries: MemberSummaryData[] = activeMembers.map((member, i) => ({
    member,
    sloName: memberDefinitionMap.get(member.sloId)!.name,
    summary: {
      sliValue: summaryResults[i].summary.sliValue,
      status: summaryResults[i].summary.status,
      errorBudget: summaryResults[i].summary.errorBudget,
      fiveMinuteBurnRate: summaryResults[i].summary.fiveMinuteBurnRate,
      oneHourBurnRate: summaryResults[i].summary.oneHourBurnRate,
      oneDayBurnRate: summaryResults[i].summary.oneDayBurnRate,
    },
    burnRateWindows: summaryResults[i].burnRateWindows,
  }));

  const unresolvedMemberIds = compositeSlo.members
    .filter((m) => !memberDefinitionMap.has(m.sloId))
    .map((m) => m.sloId);

  return {
    memberSummaries,
    unresolvedMemberIds,
  };
}

export async function computeLiveCompositeSummary(
  compositeSlo: CompositeSLODefinition,
  dependencies: Dependencies
) {
  const { memberSummaries, unresolvedMemberIds } = await computeMemberSummaries(
    compositeSlo,
    dependencies
  );
  const { compositeSummary, members } = computeCompositeSummary(compositeSlo, memberSummaries);
  return { compositeSummary, members, unresolvedMemberIds };
}
