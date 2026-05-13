/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CreateCompositeSLOInput, CreateCompositeSLOResponse } from '@kbn/slo-schema';
import { v4 as uuidv4 } from 'uuid';
import type { CompositeSLORepository } from './composite_slo_repository';
import { persistCompositeSummaryDoc } from './composite_summary_writer';
import type { SLODefinitionRepository } from '../slo_definition_repository';
import type { SummaryClient } from '../summary_client';

export interface CreateCompositeSloParams extends CreateCompositeSLOInput {
  spaceId: string;
  userId: string;
}

export interface CreateCompositeSloDeps {
  esClient: ElasticsearchClient;
  compositeSloRepository: CompositeSLORepository;
  sloDefinitionRepository: SLODefinitionRepository;
  summaryClient: SummaryClient;
  logger: Logger;
}

export const createCompositeSlo = async (
  params: CreateCompositeSloParams,
  deps: CreateCompositeSloDeps
): Promise<CreateCompositeSLOResponse> => {
  const { spaceId, userId, ...body } = params;
  const now = new Date().toISOString();
  const compositeSlo = {
    ...body,
    id: body.id ?? uuidv4(),
    tags: body.tags ?? [],
    enabled: body.enabled ?? true,
    version: 1,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  };

  const created = await deps.compositeSloRepository.create(compositeSlo);

  await persistCompositeSummaryDoc({
    esClient: deps.esClient,
    summaryClient: deps.summaryClient,
    sloDefinitionRepository: deps.sloDefinitionRepository,
    logger: deps.logger,
    spaceId,
    compositeSlo: created,
  });

  return created;
};
