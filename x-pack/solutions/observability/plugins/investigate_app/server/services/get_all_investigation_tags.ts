/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GetAllInvestigationTagsResponse,
  getAllInvestigationTagsResponseSchema,
} from '@kbn/investigation-shared';
import { InvestigationRepository } from './investigation_repository';

export async function getAllInvestigationTags(
  repository: InvestigationRepository
): Promise<GetAllInvestigationTagsResponse> {
  const tags = await repository.findAllTags();
  return getAllInvestigationTagsResponseSchema.parse(tags);
}
