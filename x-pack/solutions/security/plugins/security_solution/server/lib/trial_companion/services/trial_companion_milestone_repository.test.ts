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

    it('should propagate errors', async () => {
      soClient.create.mockRejectedValue(new Error('test error'));
      await expect(repository.create(Milestone.M2)).rejects.toThrow('test error');
    });
  });

  describe('getCurrent', () => {
    it('should return undefined if no saved objects', async () => {
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 });
      const result = await repository.getCurrent();
      expect(result).toBeUndefined();
      expect(soClient.find).toHaveBeenCalledWith({ type: NBA_SAVED_OBJECT_TYPE });
    });

    it('should propagate errors', async () => {
      soClient.find.mockRejectedValue(new Error('test error'));
      await expect(repository.getCurrent()).rejects.toThrow('test error');
      expect(soClient.find).toHaveBeenCalledWith({ type: NBA_SAVED_OBJECT_TYPE });
    });

    it('should return first so id', async () => {
      const savedObjectId = 'abc';
      soClient.find.mockResolvedValue({
        saved_objects: [
          { id: savedObjectId, attributes: { milestoneId: 2 } },
          { id: '123', attributes: { milestoneId: 3 } },
        ],
        total: 2,
      });
      const result = await repository.getCurrent();
      expect(soClient.find).toHaveBeenCalledWith({ type: NBA_SAVED_OBJECT_TYPE });
      expect(result).toEqual({ milestoneId: Milestone.M2, savedObjectId });
    });
  });

  describe('update', () => {
    it('should update milestoneId', async () => {
      const milestoneId = Milestone.M2;
      const savedObjectId = 'abc';
      soClient.update.mockResolvedValue({ id: savedObjectId, attributes: { milestoneId } });
      await repository.update({ milestoneId, savedObjectId });
      expect(soClient.update).toHaveBeenCalledWith(NBA_SAVED_OBJECT_TYPE, savedObjectId, {
        milestoneId,
      });
    });
    it('should propagate errors', async () => {
      const milestoneId = Milestone.M2;
      const savedObjectId = 'abc';
      soClient.update.mockRejectedValue(new Error('test error'));
      await expect(repository.update({ milestoneId, savedObjectId })).rejects.toThrow('test error');
      expect(soClient.update).toHaveBeenCalledWith(NBA_SAVED_OBJECT_TYPE, savedObjectId, {
        milestoneId,
      });
    });
  });
});
