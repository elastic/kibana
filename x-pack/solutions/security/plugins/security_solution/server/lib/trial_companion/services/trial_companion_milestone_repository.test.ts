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
      const ids: Milestone[] = [Milestone.M1, Milestone.M2];
      const savedObjectId = 'abc';
      soClient.create.mockResolvedValue({
        id: savedObjectId,
        type: NBA_SAVED_OBJECT_TYPE,
        attributes: { openTODOs: [1, 2] },
        references: [],
      });
      const result = await repository.create(ids);
      expect(result).toEqual({
        openTODOs: ids,
        savedObjectId,
      });
      expect(soClient.create).toHaveBeenCalledWith(NBA_SAVED_OBJECT_TYPE, { openTODOs: ids });
    });

    it('should propagate errors', async () => {
      soClient.create.mockRejectedValue(new Error('test error'));
      await expect(repository.create([Milestone.M2])).rejects.toThrow('test error');
    });
  });

  describe('getCurrent', () => {
    it('should return undefined if no saved objects', async () => {
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 0, page: 0 });
      const result = await repository.getCurrent();
      expect(result).toBeUndefined();
      expect(soClient.find).toHaveBeenCalledWith({ type: NBA_SAVED_OBJECT_TYPE });
    });

    it('should propagate errors', async () => {
      soClient.find.mockRejectedValue(new Error('test error'));
      await expect(repository.getCurrent()).rejects.toThrow('test error');
      expect(soClient.find).toHaveBeenCalledWith({ type: NBA_SAVED_OBJECT_TYPE });
    });

    it.each([
      [
        'returns first milestone',
        [
          {
            id: 'abc',
            attributes: { openTODOs: [2] },
            score: 0,
            references: [],
            type: NBA_SAVED_OBJECT_TYPE,
          },
          {
            id: '123',
            attributes: { openTODOs: [1, 2, 3] },
            score: 0,
            references: [],
            type: NBA_SAVED_OBJECT_TYPE,
          },
        ],
        2,
        { openTODOs: [Milestone.M2], savedObjectId: 'abc' },
      ],
      [
        'returns dismiss true',
        [
          {
            id: 'a',
            attributes: { openTODOs: [1, 2, 4], dismiss: true },
            score: 0,
            references: [],
            type: NBA_SAVED_OBJECT_TYPE,
          },
        ],
        1,
        {
          openTODOs: [Milestone.M1, Milestone.M2, Milestone.M4],
          savedObjectId: 'a',
          dismiss: true,
        },
      ],
      [
        'returns dismiss false',
        [
          {
            id: 'a',
            attributes: { openTODOs: [1, 2, 4], dismiss: false },
            score: 0,
            references: [],
            type: NBA_SAVED_OBJECT_TYPE,
          },
        ],
        1,
        {
          openTODOs: [Milestone.M1, Milestone.M2, Milestone.M4],
          savedObjectId: 'a',
          dismiss: false,
        },
      ],
    ])('should return value', async (_title, savedSO, total, expected) => {
      soClient.find.mockResolvedValue({
        saved_objects: savedSO,
        total,
        per_page: 0,
        page: 0,
      });
      const result = await repository.getCurrent();
      expect(soClient.find).toHaveBeenCalledWith({ type: NBA_SAVED_OBJECT_TYPE });
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should update openTODOs', async () => {
      const openTODOs = [Milestone.M2, Milestone.M4];
      const savedObjectId = 'abc';
      soClient.update.mockResolvedValue({
        id: savedObjectId,
        attributes: { openTODOs },
        type: NBA_SAVED_OBJECT_TYPE,
        references: [],
      });
      await repository.update({ openTODOs, savedObjectId, dismiss: true });
      expect(soClient.update).toHaveBeenCalledWith(NBA_SAVED_OBJECT_TYPE, savedObjectId, {
        openTODOs,
        dismiss: true,
      });
    });
    it('should propagate errors', async () => {
      const openTODOs = [Milestone.M2, Milestone.M4];
      const savedObjectId = 'abc';
      soClient.update.mockRejectedValue(new Error('test error'));
      await expect(repository.update({ openTODOs, savedObjectId })).rejects.toThrow('test error');
      expect(soClient.update).toHaveBeenCalledWith(NBA_SAVED_OBJECT_TYPE, savedObjectId, {
        openTODOs,
      });
    });
  });
});
