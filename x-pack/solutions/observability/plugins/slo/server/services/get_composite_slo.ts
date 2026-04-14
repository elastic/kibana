/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BatchGetCompositeSLOResponse,
  CompositeSLOMemberSummary,
  CompositeSLOSummary,
  GetCompositeSLOResponse,
} from '@kbn/slo-schema';
import {
  ALL_VALUE,
  batchGetCompositeSLOResponseSchema,
  getCompositeSLOResponseSchema,
} from '@kbn/slo-schema';
import { toHighPrecision } from '../utils/number';
import type { CompositeSLODefinition } from '../domain/models';
import {
  computeWeightedSli,
  computeNormalisedWeights,
  NO_DATA,
  toErrorBudget,
} from '../domain/services';
import type { CompositeSLORepository } from './composite_slo_repository';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { BurnRateWindow, SummaryClient } from './summary_client';

interface MemberSummaryData {
  member: { sloId: string; weight: number; instanceId?: string };
  sloName: string;
  summary: {
    sliValue: number;
    fiveMinuteBurnRate: number;
    oneHourBurnRate: number;
    oneDayBurnRate: number;
  };
  burnRateWindows: BurnRateWindow[];
}

export class GetCompositeSLO {
  constructor(
    private compositeSloRepository: CompositeSLORepository,
    private sloDefinitionRepository: SLODefinitionRepository,
    private summaryClient: SummaryClient
  ) {}

  public async executeBatch(ids: string[]): Promise<BatchGetCompositeSLOResponse> {
    const results = await Promise.all(ids.map((id) => this.executeOne(id)));
    return batchGetCompositeSLOResponseSchema.encode(results);
  }

  public async execute(id: string): Promise<GetCompositeSLOResponse> {
    const result = await this.executeOne(id);
    return getCompositeSLOResponseSchema.encode(result);
  }

  private async executeOne(id: string) {
    const compositeSlo = await this.compositeSloRepository.findById(id);
    const memberSloIds = compositeSlo.members.map((m) => m.sloId);
    const memberDefinitions = await this.sloDefinitionRepository.findAllByIds(memberSloIds);

    const memberDefinitionMap = new Map(memberDefinitions.map((slo) => [slo.id, slo]));

    const activeMembers = compositeSlo.members.filter((member) =>
      memberDefinitionMap.has(member.sloId)
    );

    const summaryParams = activeMembers.map((member) => ({
      slo: memberDefinitionMap.get(member.sloId)!,
      instanceId: member.instanceId ?? ALL_VALUE,
      timeWindowOverride: compositeSlo.timeWindow,
    }));

    const summaryResults = await this.summaryClient.computeSummaries(summaryParams);

    const memberSummaries: MemberSummaryData[] = activeMembers.map((member, i) => ({
      member,
      sloName: memberDefinitionMap.get(member.sloId)!.name,
      summary: summaryResults[i].summary,
      burnRateWindows: summaryResults[i].burnRateWindows,
    }));

    const { compositeSummary, members } = this.computeWeightedAggregate(
      compositeSlo,
      memberSummaries
    );

    return {
      ...compositeSlo,
      summary: compositeSummary,
      members,
    };
  }

  private computeWeightedAggregate(
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
        compositeSummary: this.buildNoDataSummary(),
        members: memberSummaries.map((ms) => this.buildMemberSummary(ms, 0)),
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

    const members = memberSummaries.map((ms, i) =>
      this.buildMemberSummary(ms, normalisedWeights[i])
    );

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

  private buildMemberSummary(
    ms: {
      member: { sloId: string; weight: number; instanceId?: string };
      sloName: string;
      summary: { sliValue: number };
    },
    normalisedWeight: number
  ): CompositeSLOMemberSummary {
    const sliValue = ms.summary.sliValue;
    const contribution = sliValue === NO_DATA ? 0 : toHighPrecision(normalisedWeight * sliValue);

    return {
      id: ms.member.sloId,
      name: ms.sloName,
      weight: ms.member.weight,
      normalisedWeight,
      sliValue,
      contribution,
      ...(ms.member.instanceId !== undefined ? { instanceId: ms.member.instanceId } : {}),
    };
  }

  private buildNoDataSummary(): CompositeSLOSummary {
    return {
      sliValue: NO_DATA,
      errorBudget: toErrorBudget(0, 0),
      status: 'NO_DATA',
      fiveMinuteBurnRate: 0,
      oneHourBurnRate: 0,
      oneDayBurnRate: 0,
    };
  }
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
