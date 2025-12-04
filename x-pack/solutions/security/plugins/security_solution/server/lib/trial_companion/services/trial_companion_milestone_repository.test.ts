/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TrialCompanionMilestoneRepository } from './trial_companion_milestone_repository.types';
import { TrialCompanionMilestoneRepositoryImpl } from './trial_companion_milestone_repository';
import { Milestone } from '../../../../common/trial_companion/types';
import { NBA_SAVED_OBJECT_TYPE } from '../saved_objects';

describe('TrialCompanionMilestoneRepositoryImpl', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let repository: TrialCompanionMilestoneRepository;
  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    repository = new TrialCompanionMilestoneRepositoryImpl(
      loggingSystemMock.createLogger(),
      soClient
    );
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should return so id', async () => {
      const id: Milestone = Milestone.M2;
      const savedObjectId = 'abc';
      soClient.create.mockResolvedValue({ id: savedObjectId, attributes: { milestoneId: 2 } });
      const result = await repository.create(id);
      expect(result).toEqual({
        milestoneId: id,
        savedObjectId,
      });
      expect(soClient.create).toHaveBeenCalledWith(NBA_SAVED_OBJECT_TYPE, { milestoneId: id });
    });
  });
});
