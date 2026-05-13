/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ALL_VALUE } from '@kbn/slo-schema';
import type { CompositeSLOMemberSummary } from '@kbn/slo-schema';
import { COMPOSITE_SUMMARY_INDEX_NAME } from '../../../common/constants';
import type { CompositeSLODefinition } from '../../domain/models';
import { toRichRollingTimeWindow } from '../../domain/models';
import { retryTransientEsErrors } from '../../utils/retry';
import { buildCompositeSloSummaryDocId } from './composite_slo_summary_index';
import { computeCompositeSummary, type MemberSummaryData } from './compute_composite_summary';
import type { SLODefinitionRepository } from '../slo_definition_repository';
import type { SummaryClient } from '../summary_client';

export interface CompositeSummaryDoc {
  spaceId: string;
  summaryUpdatedAt: string;
  compositeSlo: {
    id: string;
    name: string;
    description: string;
    tags: string[];
    objective: { target: number };
    timeWindow: { duration: string; type: string };
    budgetingMethod: string;
    createdAt: string;
    updatedAt: string;
  };
  sliValue: number;
  status: string;
  errorBudgetInitial: number;
  errorBudgetConsumed: number;
  errorBudgetRemaining: number;
  errorBudgetIsEstimated: boolean;
  fiveMinuteBurnRate: number;
  oneHourBurnRate: number;
  oneDayBurnRate: number;
  unresolvedMemberIds: string[];
  members: CompositeSLOMemberSummary[];
}

export function buildCompositeSummaryDoc(
  compositeSlo: CompositeSLODefinition,
  summary: ReturnType<typeof computeCompositeSummary>['compositeSummary'],
  members: CompositeSLOMemberSummary[],
  spaceId: string,
  unresolvedMemberIds: string[]
): CompositeSummaryDoc {
  return {
    spaceId,
    summaryUpdatedAt: new Date().toISOString(),
    compositeSlo: {
      id: compositeSlo.id,
      name: compositeSlo.name,
      description: compositeSlo.description,
      tags: compositeSlo.tags,
      objective: { target: compositeSlo.objective.target },
      timeWindow: {
        duration: compositeSlo.timeWindow.duration,
        type: compositeSlo.timeWindow.type,
      },
      budgetingMethod: compositeSlo.budgetingMethod,
      createdAt: compositeSlo.createdAt,
      updatedAt: compositeSlo.updatedAt,
    },
    sliValue: summary.sliValue,
    status: summary.status,
    errorBudgetInitial: summary.errorBudget.initial,
    errorBudgetConsumed: summary.errorBudget.consumed,
    errorBudgetRemaining: summary.errorBudget.remaining,
    errorBudgetIsEstimated: summary.errorBudget.isEstimated,
    fiveMinuteBurnRate: summary.fiveMinuteBurnRate,
    oneHourBurnRate: summary.oneHourBurnRate,
    oneDayBurnRate: summary.oneDayBurnRate,
    unresolvedMemberIds,
    members,
  };
}

interface PersistCompositeSummaryDocParams {
  esClient: ElasticsearchClient;
  summaryClient: SummaryClient;
  sloDefinitionRepository: SLODefinitionRepository;
  logger: Logger;
  spaceId: string;
  compositeSlo: CompositeSLODefinition;
}

/**
 * Computes a composite SLO summary live and writes it to the summary index with refresh: true.
 * Used by create/update routes to ensure the find route can immediately surface newly created
 * or updated composites without waiting for the next background task run.
 */
export async function persistCompositeSummaryDoc({
  esClient,
  summaryClient,
  sloDefinitionRepository,
  logger,
  spaceId,
  compositeSlo,
}: PersistCompositeSummaryDocParams): Promise<void> {
  const memberSloIds = compositeSlo.members.map((m) => m.sloId);
  const memberDefinitions = await sloDefinitionRepository.findAllByIds(memberSloIds);
  const memberDefinitionMap = new Map(memberDefinitions.map((slo) => [slo.id, slo]));

  const unresolvedMemberIds = compositeSlo.members
    .filter((m) => !memberDefinitionMap.has(m.sloId))
    .map((m) => m.sloId);

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
      fiveMinuteBurnRate: summaryResults[i].summary.fiveMinuteBurnRate,
      oneHourBurnRate: summaryResults[i].summary.oneHourBurnRate,
      oneDayBurnRate: summaryResults[i].summary.oneDayBurnRate,
    },
    burnRateWindows: summaryResults[i].burnRateWindows,
  }));

  const { compositeSummary, members } = computeCompositeSummary(compositeSlo, memberSummaries);

  const doc = buildCompositeSummaryDoc(
    compositeSlo,
    compositeSummary,
    members,
    spaceId,
    unresolvedMemberIds
  );

  await retryTransientEsErrors(
    () =>
      esClient.index({
        index: COMPOSITE_SUMMARY_INDEX_NAME,
        id: buildCompositeSloSummaryDocId(spaceId, compositeSlo.id),
        document: doc,
        refresh: true,
      }),
    { logger }
  );
}
