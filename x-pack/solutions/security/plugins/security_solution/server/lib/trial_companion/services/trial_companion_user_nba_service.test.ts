/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { TrialCompanionUserNBAService } from './trial_companion_user_nba_service.types';
import { TrialCompanionUserNBAServiceImpl } from './trial_companion_user_nba_service';
import { Milestone } from '../../../../common/trial_companion/types';
import type { TrialCompanionMilestoneRepository } from './trial_companion_milestone_repository.types';
import { lazyObject } from '@kbn/lazy-object';

describe('TrialCompanionUserNBAServiceImpl', () => {
  const repo: jest.Mocked<TrialCompanionMilestoneRepository> = lazyObject({
    getCurrent: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  });
  let sut: TrialCompanionUserNBAService;
  beforeEach(() => {
    sut = new TrialCompanionUserNBAServiceImpl(loggingSystemMock.createLogger(), repo);
    jest.clearAllMocks();
  });

  describe('openTODOs', () => {
    it('returns undefined when no TODOs are stored', async () => {
      repo.getCurrent.mockResolvedValueOnce(undefined);
      await expect(sut.openTODOs()).resolves.toBeUndefined();
      expect(repo.getCurrent).toHaveBeenCalledTimes(1);
    });

    it('returns open TODO list with dismiss state', async () => {
      repo.getCurrent.mockResolvedValueOnce({
        savedObjectId: 'abc',
        openTODOs: [Milestone.M1, Milestone.M3],
        dismiss: true,
      });
      await expect(sut.openTODOs()).resolves.toEqual({
        openTODOs: [Milestone.M1, Milestone.M3],
        dismiss: true,
      });
      expect(repo.getCurrent).toHaveBeenCalledTimes(1);
    });
  });

  describe('dismiss', () => {
    it('does nothing when no current TODO list exists', async () => {
      repo.getCurrent.mockResolvedValueOnce(undefined);
      await expect(sut.dismiss('test-user')).resolves.toBeUndefined();
      expect(repo.getCurrent).toHaveBeenCalledTimes(1);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('marks TODOs as dismissed', async () => {
      repo.getCurrent.mockResolvedValueOnce({
        savedObjectId: 'abc',
        openTODOs: [Milestone.M2],
        dismiss: false,
      });
      await expect(sut.dismiss('test-user')).resolves.toBeUndefined();
      expect(repo.update).toHaveBeenCalledWith({
        savedObjectId: 'abc',
        openTODOs: [Milestone.M2],
        dismiss: true,
      });
    });
  });
});
