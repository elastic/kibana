/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CreateCompositeSLOParams, CreateCompositeSLOResponse } from '@kbn/slo-schema';
import { createCompositeSLOResponseSchema } from '@kbn/slo-schema';
import { v4 as uuidv4 } from 'uuid';
import type { SloTelemetryReporter } from '../../lib/telemetry';
import {
  COMPOSITE_SLO_CREATED_EBT_EVENT_TYPE,
  toCompositeSloDefinitionEbtData,
} from '../../lib/telemetry';
import type { SLODefinitionRepository } from '../slo_definition_repository';
import type { SummaryClient } from '../summary_client';
import type { CompositeSLORepository } from './composite_slo_repository';
import { computeAndPersistCompositeSummaryDoc } from './composite_summary_writer';

export interface CreateCompositeSloParams extends CreateCompositeSLOParams {
  spaceId: string;
  userId: string;
}

interface Dependencies {
  esClient: ElasticsearchClient;
  compositeRepository: CompositeSLORepository;
  repository: SLODefinitionRepository;
  summaryClient: SummaryClient;
  logger: Logger;
  telemetry: SloTelemetryReporter;
}

export async function createCompositeSlo(
  params: CreateCompositeSloParams,
  { esClient, compositeRepository, repository, summaryClient, logger, telemetry }: Dependencies
): Promise<CreateCompositeSLOResponse> {
  const { spaceId, userId, ...body } = params;
  const now = new Date();
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

  const created = await compositeRepository.create(compositeSlo);

  telemetry.report(COMPOSITE_SLO_CREATED_EBT_EVENT_TYPE, () =>
    toCompositeSloDefinitionEbtData(created)
  );

  await computeAndPersistCompositeSummaryDoc(created, {
    esClient,
    summaryClient,
    repository,
    logger,
    spaceId,
  });

  return createCompositeSLOResponseSchema.encode(created);
}
