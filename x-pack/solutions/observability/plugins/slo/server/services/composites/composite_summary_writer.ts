/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CompositeSLOMemberWithSummary, CompositeSLOSummaryDocument } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import { COMPOSITE_SUMMARY_INDEX_NAME } from '../../../common/constants';
import type { CompositeSLODefinition } from '../../domain/models';
import { toRichRollingTimeWindow } from '../../domain/models';
import { retryTransientEsErrors } from '../../utils/retry';
import type { SLODefinitionRepository } from '../slo_definition_repository';
import type { SummaryClient } from '../summary_client';
import { buildCompositeSloSummaryDocId } from './composite_slo_summary_index';
import { computeCompositeSummary, type MemberSummaryData } from './compute_composite_summary';

export type CompositeSummaryDoc = CompositeSLOSummaryDocument;

export function buildCompositeSummaryDoc(
  compositeSlo: CompositeSLODefinition,
  summary: ReturnType<typeof computeCompositeSummary>['compositeSummary'],
  members: CompositeSLOMemberWithSummary[],
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
    summary,
    unresolvedMemberIds,
    members,
  };
}

interface Dependencies {
  esClient: ElasticsearchClient;
  summaryClient: SummaryClient;
  repository: SLODefinitionRepository;
  logger: Logger;
  spaceId: string;
}

/**
 * Computes a composite SLO summary live and writes it to the summary index with refresh: true.
 * Used by create/update routes to ensure the find route can immediately surface newly created
 * or updated composites without waiting for the next background task run.
 * TODO: this does not only persist - to refactor to not be misleading
 */
export async function persistCompositeSummaryDoc(
  compositeSlo: CompositeSLODefinition,
  { esClient, summaryClient, repository, logger, spaceId }: Dependencies
): Promise<void> {
  const memberSloIds = compositeSlo.members.map((m) => m.sloId);
  const memberDefinitions = await repository.findAllByIds(memberSloIds);
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
      errorBudget: summaryResults[i].summary.errorBudget,
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
