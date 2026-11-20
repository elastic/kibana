/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { UpdateCompositeSLOParams, UpdateCompositeSLOResponse } from '@kbn/slo-schema';
import { updateCompositeSLOResponseSchema } from '@kbn/slo-schema';
import type { SloTelemetryReporter } from '../../lib/telemetry';
import {
  COMPOSITE_SLO_UPDATED_EBT_EVENT_TYPE,
  getCompositeChangedFields,
  toCompositeSloDefinitionEbtData,
} from '../../lib/telemetry';
import type { SLODefinitionRepository } from '../slo_definition_repository';
import type { SummaryClient } from '../summary_client';
import type { CompositeSLORepository } from './composite_slo_repository';
import { computeAndPersistCompositeSummaryDoc } from './composite_summary_writer';

interface UpdateCompositeSloParams extends UpdateCompositeSLOParams {
  id: string;
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

export async function updateCompositeSlo(
  params: UpdateCompositeSloParams,
  { esClient, compositeRepository, repository, summaryClient, logger, telemetry }: Dependencies
): Promise<UpdateCompositeSLOResponse> {
  const { id, spaceId, userId, ...body } = params;
  const existing = await compositeRepository.findById(id);

  const updated = await compositeRepository.update({
    ...existing,
    ...body,
    updatedAt: new Date(),
    updatedBy: userId,
  });

  telemetry.report(COMPOSITE_SLO_UPDATED_EBT_EVENT_TYPE, () => ({
    ...toCompositeSloDefinitionEbtData(updated),
    changed_fields: getCompositeChangedFields(existing, updated),
  }));

  await computeAndPersistCompositeSummaryDoc(updated, {
    esClient,
    summaryClient,
    repository,
    logger,
    spaceId,
  });

  return updateCompositeSLOResponseSchema.encode(updated);
}
