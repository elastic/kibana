/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Milestone } from '../../../../common/trial_companion/types';
import type {
  TrialCompanionMilestoneRepository,
  NBAToBeDone,
} from './trial_companion_milestone_repository.types';
import type { NBASavedObjectAttributes } from '../saved_objects';
import { NBA_SAVED_OBJECT_TYPE } from '../saved_objects';

function toOpenTODOs(result: SavedObject<NBASavedObjectAttributes>): NBAToBeDone {
  return {
    openTODOs: result.attributes.openTODOs,
    savedObjectId: result.id,
    dismiss: result.attributes.dismiss,
  } as NBAToBeDone;
}

export class TrialCompanionMilestoneRepositoryImpl implements TrialCompanionMilestoneRepository {
  private readonly logger: Logger;
  private readonly soClient: SavedObjectsClientContract;

  constructor(logger: Logger, soClient: SavedObjectsClientContract) {
    this.logger = logger;
    this.soClient = soClient;
  }

  async create(milestoneIds: Milestone[]): Promise<NBAToBeDone> {
    const response = await this.soClient.create<NBASavedObjectAttributes>(NBA_SAVED_OBJECT_TYPE, {
      openTODOs: milestoneIds,
    });
    return toOpenTODOs(response);
  }

  async getCurrent(): Promise<NBAToBeDone | undefined> {
    const response = await this.soClient.find<NBASavedObjectAttributes>({
      type: NBA_SAVED_OBJECT_TYPE,
    });
    if (response.total === 0) {
      return undefined;
    }

    const result = response.saved_objects[0];
    return toOpenTODOs(result);
  }

  async update(toBeDone: NBAToBeDone): Promise<void> {
    const response = await this.soClient.update<NBASavedObjectAttributes>(
      NBA_SAVED_OBJECT_TYPE,
      toBeDone.savedObjectId,
      {
        openTODOs: toBeDone.openTODOs,
        dismiss: toBeDone.dismiss,
      }
    );

    this.logger.debug(
      `Saved open TODOs with id ${response.id} and ${
        toBeDone.openTODOs
      }. Response: ${JSON.stringify(response)}`
    );
  }
}
