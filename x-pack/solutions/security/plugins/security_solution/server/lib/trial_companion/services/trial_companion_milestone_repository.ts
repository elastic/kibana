/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { MilestoneID } from '../../../../common/trial_companion/types';
import type { NBAMilestone } from '../types';
import type { TrialCompanionMilestoneRepository } from './trial_companion_milestone_repository.types';
import type { NBASavedObjectAttributes } from '../saved_objects';
import { NBA_SAVED_OBJECT_TYPE } from '../saved_objects';

function toMilestone(result: SavedObject<NBASavedObjectAttributes>): NBAMilestone {
  return {
    milestoneId: result.attributes.milestoneId as MilestoneID,
    savedObjectId: result.id,
  } as NBAMilestone;
}

export class TrialCompanionMilestoneRepositoryImpl implements TrialCompanionMilestoneRepository {
  private readonly logger: Logger;
  private readonly soClient: SavedObjectsClientContract;

  constructor(logger: Logger, soClient: SavedObjectsClientContract) {
    this.logger = logger;
    this.soClient = soClient;
  }

  async create(id: MilestoneID): Promise<NBAMilestone> {
    const response = await this.soClient.create<NBASavedObjectAttributes>(NBA_SAVED_OBJECT_TYPE, {
      milestoneId: id,
    });
    return toMilestone(response);
  }

  async getCurrent(): Promise<NBAMilestone | undefined> {
    const response = await this.soClient.find<NBASavedObjectAttributes>({
      type: NBA_SAVED_OBJECT_TYPE,
    });
    if (response.total === 0) {
      return undefined;
    }

    const result = response.saved_objects[0];
    return toMilestone(result);
  }

  async update(milestone: NBAMilestone): Promise<void> {
    const response = await this.soClient.update<NBASavedObjectAttributes>(
      NBA_SAVED_OBJECT_TYPE,
      milestone.savedObjectId,
      {
        milestoneId: milestone.milestoneId,
      }
    );

    this.logger.info(
      `Saved milestone with id ${response.id} and milestoneId ${
        milestone.milestoneId
      }. Response: ${JSON.stringify(response)}`
    );
  }
}
