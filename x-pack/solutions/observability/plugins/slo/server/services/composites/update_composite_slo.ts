/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CompositeSLODefinitionResponse, UpdateCompositeSLOInput } from '@kbn/slo-schema';
import type { SLODefinitionRepository } from '../slo_definition_repository';
import type { SummaryClient } from '../summary_client';
import type { CompositeSLORepository } from './composite_slo_repository';
import { computeAndPersistCompositeSummaryDoc } from './composite_summary_writer';

interface Dependencies {
  esClient: ElasticsearchClient;
  compositeRepository: CompositeSLORepository;
  repository: SLODefinitionRepository;
  summaryClient: SummaryClient;
  logger: Logger;
}

export async function updateCompositeSlo(
  params: UpdateCompositeSLOInput,
  { esClient, compositeRepository, repository, summaryClient, logger }: Dependencies
): Promise<CompositeSLODefinitionResponse> {
  const { id, spaceId, userId, ...body } = params;
  const existing = await compositeRepository.findById(id);

  const updated = await compositeRepository.update({
    ...existing,
    ...body,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  await computeAndPersistCompositeSummaryDoc(updated, {
    esClient,
    summaryClient,
    repository,
    logger,
    spaceId,
  });

  return updated;
}
