/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TrialCompanionMilestoneServiceImpl } from './trial_companion_milestone_service';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { lazyObject } from '@kbn/lazy-object';
import type { TrialCompanionMilestoneRepository } from './trial_companion_milestone_repository.types';
import { Milestone } from '../../../../common/trial_companion/types';
import { coreMock } from '@kbn/core/server/mocks';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import {
  TRIAL_COMPANION_DEPLOYMENT_STATE,
  TRIAL_COMPANION_MILESTONE_REFRESH_ERROR,
} from '../telemetry/trial_companion_ebt_events';

describe('TrialCompanionMilestoneServiceImpl', () => {
  let sut: TrialCompanionMilestoneServiceImpl;
  const taskManagerSetup = taskManagerMock.createSetup();
  const taskManagerStart = taskManagerMock.createStart();
  let abortController: AbortController;
  let mockCore: ReturnType<typeof coreMock.createSetup>;
  let mockTelemetry: jest.Mocked<AnalyticsServiceSetup>;
  const repo: jest.Mocked<TrialCompanionMilestoneRepository> = lazyObject({
    getCurrent: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  });
  beforeEach(() => {
    mockCore = coreMock.createSetup();
    mockTelemetry = mockCore.analytics;
    sut = new TrialCompanionMilestoneServiceImpl(loggingSystemMock.createLogger());
    abortController = new AbortController();
    jest.clearAllMocks();
  });
  describe('setup', () => {
    it.each([true, false])('should register a task when enabled: %s', (enabled) => {
      sut.setup({
        enabled,
        taskManager: taskManagerSetup,
        telemetry: mockTelemetry,
      });
      expect(taskManagerSetup.registerTaskDefinitions).toHaveBeenCalledWith({
        'security:trial-companion-milestone': {
          title: 'This task periodically checks currently achieved milestones.',
          maxAttempts: 1,
          timeout: '10m',
          createTaskRunner: expect.any(Function),
        },
      });
    });
  });
  describe('start', () => {
    it.each([true, false])('should start the task only when enabled: %s', async (enabled) => {
      sut.setup({
        enabled,
        taskManager: taskManagerSetup,
        telemetry: mockTelemetry,
      });
      await sut.start({
        taskManager: taskManagerStart,
        detectors: [],
        repo,
      });
      const assertion = expect(taskManagerStart.ensureScheduled);
      if (!enabled) {
        assertion.not.toHaveBeenCalled();
      } else {
        assertion.toHaveBeenCalledWith({
          id: 'security:trial-companion-milestone:1.0.0',
          taskType: 'security:trial-companion-milestone',
          schedule: { interval: '1m' },
          params: {},
          state: {},
          scope: ['securitySolution'],
        });
      }
    });
  });
  describe('refreshMilestones', () => {
    beforeEach(() => {
      sut.setup({
        enabled: true,
        taskManager: taskManagerSetup,
        telemetry: mockTelemetry,
      });
    });

    it('runs detectors - store result if all done', async () => {
      const mockDetectorUndefined = jest.fn(() => Promise.resolve(undefined));
      await sut.start({
        taskManager: taskManagerStart,
        detectors: [
          mockDetectorUndefined,
          mockDetectorUndefined,
          mockDetectorUndefined,
          mockDetectorUndefined,
        ],
        repo,
      });
      await sut.refreshMilestones(abortController.signal);
      expect(repo.update).not.toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(mockDetectorUndefined).toHaveBeenCalledTimes(4);
      expect(mockTelemetry.reportEvent).toHaveBeenCalled();
    });

    it('does not run detectors if abort signal', async () => {
      const mockDetectorUndefined = jest.fn(() => Promise.resolve(undefined));
      await sut.start({
        taskManager: taskManagerStart,
        detectors: [mockDetectorUndefined, mockDetectorUndefined],
        repo,
      });
      abortController.abort();
      await sut.refreshMilestones(abortController.signal);
      expect(repo.update).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
      expect(mockDetectorUndefined).not.toHaveBeenCalled();
      expect(mockTelemetry.reportEvent).not.toHaveBeenCalled();
    });

    it('no detectors - all done', async () => {
      await sut.start({
        taskManager: taskManagerStart,
        detectors: [],
        repo,
      });
      await sut.refreshMilestones(abortController.signal);
      expect(repo.update).not.toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(mockTelemetry.reportEvent).toHaveBeenCalled();
    });

    it('runs detectors - runs all detectors', async () => {
      const mockDetectorUndefined = jest.fn(() => Promise.resolve(undefined));
      const mockDetectorM1 = jest.fn(() => Promise.resolve(Milestone.M1));
      const mockDetectorM2 = jest.fn(() => Promise.resolve(Milestone.M2));
      repo.getCurrent.mockResolvedValueOnce(undefined);
      await sut.start({
        taskManager: taskManagerStart,
        detectors: [mockDetectorUndefined, mockDetectorM1, mockDetectorM2, mockDetectorUndefined],
        repo,
      });
      await sut.refreshMilestones(abortController.signal);
      expect(mockDetectorUndefined).toHaveBeenCalledTimes(2);
      expect(mockDetectorM1).toHaveBeenCalledTimes(1);
      expect(mockDetectorM2).toHaveBeenCalledTimes(1);
      expect(repo.create).toHaveBeenCalledWith([Milestone.M1, Milestone.M2]);
      expect(repo.update).not.toHaveBeenCalled();
      expect(mockTelemetry.reportEvent).toHaveBeenCalledWith(
        TRIAL_COMPANION_DEPLOYMENT_STATE.eventType,
        {
          openTODOs: [Milestone.M1, Milestone.M2],
        }
      );
    });

    it('runs detectors - update existing milestone', async () => {
      const mockDetectorUndefined = jest.fn(() => Promise.resolve(undefined));
      const mockDetectorM2 = jest.fn(() => Promise.resolve(Milestone.M2));
      repo.getCurrent.mockResolvedValueOnce({ openTODOs: [Milestone.M1], savedObjectId: 'abc' });
      await sut.start({
        taskManager: taskManagerStart,
        detectors: [
          mockDetectorUndefined,
          mockDetectorUndefined,
          mockDetectorM2,
          mockDetectorUndefined,
        ],
        repo,
      });
      await sut.refreshMilestones(abortController.signal);
      expect(mockDetectorUndefined).toHaveBeenCalledTimes(3);
      expect(mockDetectorM2).toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith({ openTODOs: [Milestone.M2], savedObjectId: 'abc' });
      expect(mockTelemetry.reportEvent).toHaveBeenCalledWith(
        TRIAL_COMPANION_DEPLOYMENT_STATE.eventType,
        {
          openTODOs: [Milestone.M2],
        }
      );
    });

    it('runs detectors - does not update the same TODO list', async () => {
      const mockDetectorUndefined = jest.fn(() => Promise.resolve(undefined));
      const mockDetectorM2 = jest.fn(() => Promise.resolve(Milestone.M2));
      const mockDetectorM3 = jest.fn(() => Promise.resolve(Milestone.M3));
      repo.getCurrent.mockResolvedValueOnce({
        openTODOs: [Milestone.M2, Milestone.M3],
        savedObjectId: 'abc',
      });
      await sut.start({
        taskManager: taskManagerStart,
        detectors: [
          mockDetectorUndefined,
          mockDetectorUndefined,
          mockDetectorUndefined,
          mockDetectorM2,
          mockDetectorM3,
        ],
        repo,
      });
      await sut.refreshMilestones(abortController.signal);
      expect(mockDetectorUndefined).toHaveBeenCalledTimes(3);
      expect(mockDetectorM2).toHaveBeenCalled();
      expect(mockDetectorM3).toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('does not propagate an error from repo.getCurrent', async () => {
      const mockDetectorM2 = jest.fn(() => Promise.resolve(Milestone.M2));
      repo.getCurrent.mockRejectedValueOnce(new Error('test error'));
      await sut.start({
        taskManager: taskManagerStart,
        detectors: [mockDetectorM2],
        repo,
      });
      await expect(sut.refreshMilestones(abortController.signal)).resolves.not.toThrowError();
      expect(repo.getCurrent).toHaveBeenCalledTimes(1);
      expect(mockTelemetry.reportEvent).toHaveBeenCalledWith(
        TRIAL_COMPANION_MILESTONE_REFRESH_ERROR.eventType,
        {
          message: 'test error',
        }
      );
    });

    it('does not propagate an error from repo.update', async () => {
      const mockDetectorM2 = jest.fn(() => Promise.resolve(Milestone.M2));
      repo.getCurrent.mockResolvedValueOnce({ openTODOs: [Milestone.M1], savedObjectId: 'abc' });
      repo.update.mockRejectedValueOnce(new Error('test error'));
      await sut.start({
        taskManager: taskManagerStart,
        detectors: [mockDetectorM2],
        repo,
      });
      await expect(sut.refreshMilestones(abortController.signal)).resolves.not.toThrowError();
      expect(repo.update).toHaveBeenCalledTimes(1);
    });

    it('does not propagate an error from repo.create', async () => {
      const mockDetectorM2 = jest.fn(() => Promise.resolve(Milestone.M2));
      repo.getCurrent.mockResolvedValueOnce(undefined);
      repo.create.mockRejectedValueOnce(new Error('test error'));
      await sut.start({
        taskManager: taskManagerStart,
        detectors: [mockDetectorM2],
        repo,
      });
      await expect(sut.refreshMilestones(abortController.signal)).resolves.not.toThrowError();
      expect(repo.create).toHaveBeenCalledTimes(1);
    });

    it('does not propagate an error from detectors', async () => {
      const mockDetectorError = jest.fn(() => Promise.reject(new Error('test error')));
      repo.getCurrent.mockResolvedValueOnce(undefined);
      await sut.start({
        taskManager: taskManagerStart,
        detectors: [mockDetectorError],
        repo,
      });
      await expect(sut.refreshMilestones(abortController.signal)).resolves.not.toThrowError();
      expect(repo.getCurrent).toHaveBeenCalledTimes(1);
      expect(mockDetectorError).toHaveBeenCalledTimes(1);
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
