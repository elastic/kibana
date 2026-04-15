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
import type {
  BatchGetCompositeSLOResponse,
  CompositeSLOSummary,
  GetCompositeSLOResponse,
} from '@kbn/slo-schema';
import type { CompositeSLORepository } from './composite_slo_repository';
import { fetchCompositeSloSummariesFromIndex } from './composite_slo_summary_index';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { SummaryClient } from './summary_client';
import {
  computeCompositeSummary,
  getNoDataCompositeSloSummary,
  type MemberSummaryData,
} from './compute_composite_summary';

export interface GetCompositeSloSummaryReadContext {
  spaceId: string;
  esClient: ElasticsearchClient;
}

export class GetCompositeSLO {
  constructor(
    private compositeSloRepository: CompositeSLORepository,
    private sloDefinitionRepository: SLODefinitionRepository,
    private summaryClient: SummaryClient
  ) {}

  /**
   * Loads composite rollup summaries from the composite summary index for the given ids.
   * Returns an empty map when `summaryReadContext` is omitted or `ids` is empty (no ES call).
   */
  public async fetchPersistedSummaries(
    ids: string[],
    summaryReadContext?: GetCompositeSloSummaryReadContext
  ): Promise<Map<string, CompositeSLOSummary>> {
    if (!summaryReadContext || ids.length === 0) {
      return new Map();
    }
    return await fetchCompositeSloSummariesFromIndex(
      summaryReadContext.esClient,
      summaryReadContext.spaceId,
      ids
    );
  }

  public async executeBatch(
    ids: string[],
    summaryReadContext?: GetCompositeSloSummaryReadContext
  ): Promise<BatchGetCompositeSLOResponse> {
    const [persistedById, bases] = await Promise.all([
      this.fetchPersistedSummaries(ids, summaryReadContext),
      Promise.all(ids.map((id) => this.executeOne(id))),
    ]);
    const results = bases.map((base, i) => ({
      ...base,
      summary: persistedById.get(ids[i]) ?? getNoDataCompositeSloSummary(),
    }));
    return batchGetCompositeSLOResponseSchema.encode(results);
  }

  public async execute(
    id: string,
    summaryReadContext?: GetCompositeSloSummaryReadContext
  ): Promise<GetCompositeSLOResponse> {
    const [base, persistedById] = await Promise.all([
      this.executeOne(id),
      this.fetchPersistedSummaries([id], summaryReadContext),
    ]);
    return getCompositeSLOResponseSchema.encode({
      ...base,
      summary: persistedById.get(id) ?? getNoDataCompositeSloSummary(),
    });
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

    const { members } = computeCompositeSummary(compositeSlo, memberSummaries);

    return {
      ...compositeSlo,
      members,
    };
  }
}
