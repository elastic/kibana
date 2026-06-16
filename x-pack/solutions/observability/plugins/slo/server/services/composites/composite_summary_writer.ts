/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CompositeSLOMemberWithSummary, CompositeSLOSummaryDocument } from '@kbn/slo-schema';
import { COMPOSITE_SUMMARY_INDEX_NAME } from '../../../common/constants';
import type { CompositeSLODefinition } from '../../domain/models';
import { retryTransientEsErrors } from '../../utils/retry';
import type { SLODefinitionRepository } from '../slo_definition_repository';
import type { SummaryClient } from '../summary_client';
import { buildCompositeSloSummaryDocId } from './composite_slo_summary_index';
import type { computeCompositeSummary } from './compute_composite_summary';
import { computeLiveCompositeSummary } from './compute_composite_summary';

export function buildCompositeSummaryDoc(
  compositeSlo: CompositeSLODefinition,
  summary: ReturnType<typeof computeCompositeSummary>['compositeSummary'],
  members: CompositeSLOMemberWithSummary[],
  spaceId: string,
  unresolvedMemberIds: string[]
): CompositeSLOSummaryDocument {
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
 */
export async function computeAndPersistCompositeSummaryDoc(
  compositeSlo: CompositeSLODefinition,
  { esClient, summaryClient, repository, logger, spaceId }: Dependencies
): Promise<void> {
  const { compositeSummary, members, unresolvedMemberIds } = await computeLiveCompositeSummary(
    compositeSlo,
    { repository, summaryClient }
  );

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
