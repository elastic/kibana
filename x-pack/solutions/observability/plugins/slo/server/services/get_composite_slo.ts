/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BatchGetCompositeSLOResponse, GetCompositeSLOResponse } from '@kbn/slo-schema';
import {
  ALL_VALUE,
  batchGetCompositeSLOResponseSchema,
  getCompositeSLOResponseSchema,
} from '@kbn/slo-schema';
import type { CompositeSLORepository } from './composite_slo_repository';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { SummaryClient } from './summary_client';
import { computeCompositeSummary, type MemberSummaryData } from './compute_composite_summary';

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
      budgetingMethodOverride: compositeSlo.budgetingMethod,
    }));

    const summaryResults = await this.summaryClient.computeSummaries(summaryParams);

    const memberSummaries: MemberSummaryData[] = activeMembers.map((member, i) => ({
      member,
      sloName: memberDefinitionMap.get(member.sloId)!.name,
      summary: summaryResults[i].summary,
      burnRateWindows: summaryResults[i].burnRateWindows,
    }));

    const { compositeSummary, members } = computeCompositeSummary(compositeSlo, memberSummaries);

    return {
      ...compositeSlo,
      summary: compositeSummary,
      members,
    };
  }
}
