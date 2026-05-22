/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { UpdateCompositeSLOInput, UpdateCompositeSLOResponse } from '@kbn/slo-schema';
import type { CompositeSLORepository } from './composite_slo_repository';
import { persistCompositeSummaryDoc } from './composite_summary_writer';
import type { SLODefinitionRepository } from '../slo_definition_repository';
import type { SummaryClient } from '../summary_client';

export interface UpdateCompositeSloParams extends UpdateCompositeSLOInput {
  id: string;
  spaceId: string;
  userId: string | undefined;
}

export interface UpdateCompositeSloDeps {
  esClient: ElasticsearchClient;
  compositeSloRepository: CompositeSLORepository;
  sloDefinitionRepository: SLODefinitionRepository;
  summaryClient: SummaryClient;
  logger: Logger;
}

export const updateCompositeSlo = async (
  params: UpdateCompositeSloParams,
  deps: UpdateCompositeSloDeps
): Promise<UpdateCompositeSLOResponse> => {
  const { id, spaceId, userId, ...body } = params;
  const existing = await deps.compositeSloRepository.findById(id);

  const updated = {
    ...existing,
    ...body,
    updatedAt: new Date().toISOString(),
    updatedBy: userId ?? existing.updatedBy,
  };

  const result = await deps.compositeSloRepository.update(updated);

  await persistCompositeSummaryDoc({
    esClient: deps.esClient,
    summaryClient: deps.summaryClient,
    sloDefinitionRepository: deps.sloDefinitionRepository,
    logger: deps.logger,
    spaceId,
    compositeSlo: result,
  });

  return result;
};
