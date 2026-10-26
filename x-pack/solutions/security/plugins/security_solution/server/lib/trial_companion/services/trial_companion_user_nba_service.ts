/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { NBATODOList } from '../types';
import { TrialCompanionMilestoneRepositoryImpl } from './trial_companion_milestone_repository';
import type { TrialCompanionUserNBAService } from './trial_companion_user_nba_service.types';
import type { TrialCompanionMilestoneRepository } from './trial_companion_milestone_repository.types';

export const createTrialCompanionUserNBAService = (
  logger: Logger,
  soClient: SavedObjectsClientContract
) => {
  const aLogger = logger.get('trial_companion_user_nba_service');
  const repo = new TrialCompanionMilestoneRepositoryImpl(aLogger, soClient);
  return new TrialCompanionUserNBAServiceImpl(logger, repo);
};

export class TrialCompanionUserNBAServiceImpl implements TrialCompanionUserNBAService {
  private readonly logger: Logger;
  private readonly repo: TrialCompanionMilestoneRepository;

  constructor(logger: Logger, repo: TrialCompanionMilestoneRepository) {
    this.logger = logger;
    this.repo = repo;
  }
  async dismiss(username: string): Promise<void> {
    this.logger.debug(`Dismiss called by user ${username}`);
    const result = await this.repo.getCurrent();
    if (!result) return;
    await this.repo.update({ ...result, dismiss: true });
  }

  async openTODOs(): Promise<NBATODOList | undefined> {
    const result = await this.repo.getCurrent();
    if (!result) return undefined;
    return { openTODOs: result.openTODOs, dismiss: result.dismiss };
  }
}
