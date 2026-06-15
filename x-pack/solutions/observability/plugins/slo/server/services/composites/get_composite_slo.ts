/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { CompositeSLOWithSummaryResponse } from '@kbn/slo-schema';
import { ALL_VALUE, compositeSloWithSummaryResponseSchema } from '@kbn/slo-schema';
import { z } from '@kbn/zod';
import { type CompositeSLODefinition, toRichRollingTimeWindow } from '../../domain/models';
import type { SLODefinitionRepository } from '../slo_definition_repository';
import type { SummaryClient } from '../summary_client';
import type { CompositeSLORepository } from './composite_slo_repository';
import {
  fetchCompositeSloSummariesFromIndex,
  type PersistedCompositeSummary,
} from './composite_slo_summary_index';
import { computeCompositeSummary, type MemberSummaryData } from './compute_composite_summary';

export class GetCompositeSLO {
  constructor(
    private compositeRepository: CompositeSLORepository,
    private repository: SLODefinitionRepository,
    private summaryClient: SummaryClient,
    private esClient: ElasticsearchClient
  ) {}

  public async executeBatch(
    ids: string[],
    spaceId: string
  ): Promise<CompositeSLOWithSummaryResponse[]> {
    const persistedSummaryById = await this.loadPersistedSummaries(ids, spaceId);
    const results = await Promise.all(ids.map((id) => this.executeOne(id, persistedSummaryById)));
    return z.array(compositeSloWithSummaryResponseSchema).encode(results);
  }

  public async execute(id: string, spaceId: string): Promise<CompositeSLOWithSummaryResponse> {
    const persistedSummaryById = await this.loadPersistedSummaries([id], spaceId);
    const result = await this.executeOne(id, persistedSummaryById);
    return compositeSloWithSummaryResponseSchema.encode(result);
  }

  private async loadPersistedSummaries(
    ids: string[],
    spaceId: string
  ): Promise<Map<string, PersistedCompositeSummary>> {
    if (ids.length === 0) {
      return new Map();
    }
    return await fetchCompositeSloSummariesFromIndex(this.esClient, spaceId, ids);
  }

  private async executeOne(
    id: string,
    persistedSummaryById: Map<string, PersistedCompositeSummary>
  ): Promise<CompositeSLOWithSummaryResponse> {
    const compositeSlo = await this.compositeRepository.findById(id);
    const persisted = persistedSummaryById.get(id);

    // Legacy docs may not have members, so we fallback to computing the summary on the fly if they are missing.
    if (!persisted?.members) {
      return this.computeCompositeSloWithSummary(compositeSlo);
    }

    return {
      ...compositeSlo,
      summary: persisted.summary,
      members: persisted.members,
    };
  }

  private async computeCompositeSloWithSummary(
    compositeSlo: CompositeSLODefinition,
  ): Promise<CompositeSLOWithSummaryResponse> {
    const memberSloIds = compositeSlo.members.map((m) => m.sloId);
    const memberDefinitions = await this.repository.findAllByIds(memberSloIds);

    const memberDefinitionMap = new Map(memberDefinitions.map((slo) => [slo.id, slo]));

    const activeMembers = compositeSlo.members.filter((member) =>
      memberDefinitionMap.has(member.sloId)
    );

    const richTimeWindow = toRichRollingTimeWindow(compositeSlo.timeWindow);

    const summaryParams = activeMembers.map((member) => ({
      slo: memberDefinitionMap.get(member.sloId)!,
      instanceId: member.instanceId ?? ALL_VALUE,
      timeWindowOverride: richTimeWindow,
    }));

    const summaryResults = await this.summaryClient.computeSummaries(summaryParams);

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

    const { compositeSummary, members } = computeCompositeSummary(compositeSlo, memberSummaries);

    return {
      ...compositeSlo,
      summary: compositeSummary,
      members,
    };
  }
}
