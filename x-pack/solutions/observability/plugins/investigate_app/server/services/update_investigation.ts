/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core-security-common';
import { UpdateInvestigationParams, UpdateInvestigationResponse } from '@kbn/investigation-shared';
import { isEqual, omit } from 'lodash';
import { InvestigationRepository } from './investigation_repository';
import { Investigation } from '../models/investigation';

export async function updateInvestigation(
  investigationId: string,
  params: UpdateInvestigationParams,
  { repository, user }: { repository: InvestigationRepository; user: AuthenticatedUser }
): Promise<UpdateInvestigationResponse> {
  const originalInvestigation = await repository.findById(investigationId);

  const updatedInvestigation: Investigation = Object.assign({}, originalInvestigation, params, {
    updatedAt: Date.now(),
  });

  if (
    isEqual(omit(originalInvestigation, ['updatedAt']), omit(updatedInvestigation, ['updatedAt']))
  ) {
    return originalInvestigation;
  }

  await repository.save(updatedInvestigation);
  return updatedInvestigation;
}
