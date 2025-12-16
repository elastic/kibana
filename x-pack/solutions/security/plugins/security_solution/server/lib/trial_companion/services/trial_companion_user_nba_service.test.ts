/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { TrialCompanionUserNBAService } from './trial_companion_user_nba_service.types';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { TrialCompanionUserNBAServiceImpl } from './trial_companion_user_nba_service';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { Milestone } from '../../../../common/trial_companion/types';
import { NBA_SAVED_OBJECT_TYPE, NBA_USER_SEEN_SAVED_OBJECT_TYPE } from '../saved_objects';

const createSO = (attributes: unknown, type: string) => ({
  id: 'abc',
  attributes,
  score: 0,
  references: [],
  type,
});

const createNBASO = (milestoneId: number[], total: number) => {
  const savedObjects = milestoneId.map((milestone) =>
    createSO({ milestoneId: milestone }, NBA_SAVED_OBJECT_TYPE)
  );
  return {
    saved_objects: savedObjects,
    total,
    per_page: 0,
    page: 0,
  };
};

const createNBAUserSO = (
  milestoneIds: number[][],
  total: number,
  userId: string = 'test-user-id'
) => {
  const savedObjects = milestoneIds.map((milestones) =>
    createSO({ milestoneIds: milestones, userId }, NBA_USER_SEEN_SAVED_OBJECT_TYPE)
  );
  return {
    saved_objects: savedObjects,
    total,
    per_page: 0,
    page: 0,
  };
};

describe('TrialCompanionUserNBAServiceImpl', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let sut: TrialCompanionUserNBAService;
  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    sut = new TrialCompanionUserNBAServiceImpl(loggingSystemMock.createLogger(), soClient);
    jest.clearAllMocks();
  });

  describe('nextNBA', () => {
    it.each([
      ['first milestone', createNBASO([1], 1), createNBAUserSO([], 0), Milestone.M1],
      ['no data', createNBASO([], 0), createNBAUserSO([], 0), undefined],
      ['first milestone seen', createNBASO([1], 1), createNBAUserSO([[1]], 1), undefined],
      ['M6 milestone', createNBASO([6], 1), createNBAUserSO([[1, 2, 3, 4, 5]], 1), Milestone.M6],
      ['M6 seen', createNBASO([6], 1), createNBAUserSO([[1, 2, 3, 4, 5, 6]], 1), undefined],
      ['Final milestone - non seen', createNBASO([7], 1), createNBAUserSO([[]], 1), undefined],
      [
        'Final milestone - M6 seen',
        createNBASO([7], 1),
        createNBAUserSO([[1, 2, 3, 4, 5, 6]], 1),
        undefined,
      ],
      [
        'no current milestone',
        createNBASO([], 0),
        createNBAUserSO([[1, 2, 3, 4, 5]], 1),
        undefined,
      ],
    ])('should return correct next NBA milestone: %s', async (_title, nbaSO, userSO, expected) => {
      soClient.find.mockResolvedValueOnce(nbaSO);
      soClient.find.mockResolvedValueOnce(userSO);
      const userId = 'user-id';
      await expect(sut.nextNBA(userId)).resolves.toEqual(expected);
      expect(soClient.find).toHaveBeenCalledWith({ type: NBA_SAVED_OBJECT_TYPE });
      expect(soClient.find).toHaveBeenCalledWith({
        type: NBA_USER_SEEN_SAVED_OBJECT_TYPE,
        search: userId,
        searchFields: ['userId'],
      });
    });

    it('should propagate error from nba so', async () => {
      soClient.find.mockRejectedValueOnce(new Error('test error'));
      await expect(sut.nextNBA('user-id')).rejects.toThrow('test error');
      expect(soClient.find).toHaveBeenCalledWith({ type: NBA_SAVED_OBJECT_TYPE });
    });

    it('should propagate error from user nba so', async () => {
      soClient.find.mockResolvedValueOnce(createNBASO([6], 1));
      soClient.find.mockRejectedValueOnce(new Error('test error'));
      const userId = 'user-id';
      await expect(sut.nextNBA(userId)).rejects.toThrow('test error');
      expect(soClient.find).toHaveBeenCalledWith({ type: NBA_SAVED_OBJECT_TYPE });
      expect(soClient.find).toHaveBeenCalledWith({
        type: NBA_USER_SEEN_SAVED_OBJECT_TYPE,
        search: userId,
        searchFields: ['userId'],
      });
    });
  });

  describe('markAsSeen', () => {
    it('should create new user so', async () => {
      const userId = 'user-id';
      soClient.find.mockResolvedValueOnce(createNBASO([], 0));
      const actual = await sut.markAsSeen(Milestone.M2, userId);
      expect(soClient.create).toHaveBeenCalledWith(NBA_USER_SEEN_SAVED_OBJECT_TYPE, {
        userId,
        milestoneIds: [Milestone.M2],
      });
      expect(actual).toBeUndefined();
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('should update existing user so', async () => {
      const userId = 'user-id';
      soClient.find.mockResolvedValueOnce(createNBAUserSO([[1]], 1, userId));
      const actual = await sut.markAsSeen(Milestone.M2, userId);
      expect(soClient.update).toHaveBeenCalledWith(NBA_USER_SEEN_SAVED_OBJECT_TYPE, 'abc', {
        userId,
        milestoneIds: [Milestone.M1, Milestone.M2],
      });
      expect(actual).toBeUndefined();
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('should not update so if milestone already seen', async () => {
      const userId = 'user-id';
      soClient.find.mockResolvedValueOnce(createNBAUserSO([[1, 2]], 1, userId));
      const actual = await sut.markAsSeen(Milestone.M2, userId);
      expect(actual).toBeUndefined();
      expect(soClient.update).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('should propagate error if find fails', async () => {
      const userId = 'user-id';
      soClient.find.mockRejectedValue(new Error('test error'));
      await expect(sut.markAsSeen(Milestone.M2, userId)).rejects.toThrow('test error');
    });

    it('should propagate error if update fails', async () => {
      const userId = 'user-id';
      soClient.find.mockResolvedValueOnce(createNBAUserSO([[1]], 1, userId));
      soClient.update.mockRejectedValue(new Error('test error'));
      await expect(sut.markAsSeen(Milestone.M2, userId)).rejects.toThrow('test error');
    });

    it('should propagate error if create fails', async () => {
      const userId = 'user-id';
      soClient.find.mockResolvedValueOnce(createNBASO([], 0));
      soClient.create.mockRejectedValue(new Error('test error'));
      await expect(sut.markAsSeen(Milestone.M2, userId)).rejects.toThrow('test error');
    });
  });
});
