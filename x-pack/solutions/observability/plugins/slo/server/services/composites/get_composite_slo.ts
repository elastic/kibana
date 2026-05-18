/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  ALL_VALUE,
  batchGetCompositeSLOResponseSchema,
  getCompositeSLOResponseSchema,
} from '@kbn/slo-schema';
import type { BatchGetCompositeSLOResponse, GetCompositeSLOResponse } from '@kbn/slo-schema';
import { toRichRollingTimeWindow } from '../../domain/models';
import type { CompositeSLORepository } from './composite_slo_repository';
import {
  fetchCompositeSloSummariesFromIndex,
  type PersistedCompositeSummary,
} from './composite_slo_summary_index';
import type { SLODefinitionRepository } from '../slo_definition_repository';
import type { SummaryClient } from '../summary_client';
import { computeCompositeSummary, type MemberSummaryData } from './compute_composite_summary';

export class GetCompositeSLO {
  constructor(
    private compositeSloRepository: CompositeSLORepository,
    private sloDefinitionRepository: SLODefinitionRepository,
    private summaryClient: SummaryClient,
    private esClient: ElasticsearchClient
  ) {}

  public async executeBatch(ids: string[], spaceId: string): Promise<BatchGetCompositeSLOResponse> {
    const persistedSummaryById = await this.loadPersistedSummaries(ids, spaceId);
    const results = await Promise.all(ids.map((id) => this.executeOne(id, persistedSummaryById)));
    return batchGetCompositeSLOResponseSchema.encode(results);
  }

  public async execute(id: string, spaceId: string): Promise<GetCompositeSLOResponse> {
    const persistedSummaryById = await this.loadPersistedSummaries([id], spaceId);
    const result = await this.executeOne(id, persistedSummaryById);
    return getCompositeSLOResponseSchema.encode(result);
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
  ) {
    const compositeSlo = await this.compositeSloRepository.findById(id);
    const persisted = persistedSummaryById.get(id);

    if (persisted?.members) {
      return {
        ...compositeSlo,
        summary: persisted.summary,
        members: persisted.members,
      };
    }

    const memberSloIds = compositeSlo.members.map((m) => m.sloId);
    const memberDefinitions = await this.sloDefinitionRepository.findAllByIds(memberSloIds);

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
        fiveMinuteBurnRate: summaryResults[i].summary.fiveMinuteBurnRate,
        oneHourBurnRate: summaryResults[i].summary.oneHourBurnRate,
        oneDayBurnRate: summaryResults[i].summary.oneDayBurnRate,
      },
      burnRateWindows: summaryResults[i].burnRateWindows,
    }));

    const { compositeSummary, members } = computeCompositeSummary(compositeSlo, memberSummaries);
    const summary = persisted?.summary ?? compositeSummary;

    return {
      ...compositeSlo,
      summary,
      members,
    };
  }
}
