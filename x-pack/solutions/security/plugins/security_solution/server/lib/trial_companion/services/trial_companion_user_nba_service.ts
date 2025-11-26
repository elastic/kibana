/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { TrialCompanionMilestoneRepositoryImpl } from './trial_companion_milestone_repository';
import type { Milestone } from '../../../../common/trial_companion/types';
import type { TrialCompanionUserNBAService } from './trial_companion_user_nba_service.types';
import type { TrialCompanionMilestoneRepository } from './trial_companion_milestone_repository.types';
import type { NBAUserSeenSavedObjectAttributes } from '../saved_objects';
import { NBA_USER_SEEN_SAVED_OBJECT_TYPE } from '../saved_objects';

export class TrialCompanionUserNBAServiceImpl implements TrialCompanionUserNBAService {
  private readonly logger: Logger;
  private readonly soClient: SavedObjectsClientContract;
  private readonly repo: TrialCompanionMilestoneRepository;

  constructor(logger: Logger, soClient: SavedObjectsClientContract) {
    this.logger = logger;
    this.soClient = soClient;
    this.repo = new TrialCompanionMilestoneRepositoryImpl(logger, soClient);
  }

  public async markAsSeen(milestoneId: Milestone, userId: string): Promise<void> {
    const currentSO = await this.getUserNBAStatus(userId);
    const current = currentSO?.attributes;

    if (currentSO && current && !current.milestoneIds.includes(milestoneId)) {
      current.milestoneIds.push(milestoneId);
      const response = await this.soClient.update<NBAUserSeenSavedObjectAttributes>(
        NBA_USER_SEEN_SAVED_OBJECT_TYPE,
        currentSO.id,
        current
      );
      this.logger.info(`Updated user milestone seen SO: ${JSON.stringify(response)}`);
    } else {
      const response = await this.soClient.create<NBAUserSeenSavedObjectAttributes>(
        NBA_USER_SEEN_SAVED_OBJECT_TYPE,
        {
          userId,
          milestoneIds: [milestoneId],
        }
      );
      this.logger.info(`Created user milestone seen SO: ${JSON.stringify(response)}`);
    }
  }

  public async nextNBA(userId: string): Promise<Milestone | undefined> {
    const milestone = await this.repo.getCurrent();
    this.logger.info(`Fetched current milestone: ${JSON.stringify(milestone)}`);
    const userStatus = await this.getUserNBAStatus(userId);

    if (
      !milestone ||
      (userStatus && userStatus.attributes.milestoneIds.includes(milestone.milestoneId))
    ) {
      return undefined;
    }

    return milestone.milestoneId;
  }

  private async getUserNBAStatus(
    userId: string
  ): Promise<SavedObject<NBAUserSeenSavedObjectAttributes> | undefined> {
    const result = await this.soClient.find<NBAUserSeenSavedObjectAttributes>({
      type: NBA_USER_SEEN_SAVED_OBJECT_TYPE,
      search: userId,
      searchFields: ['userId'],
    });
    return result.saved_objects[0];
  }
}
