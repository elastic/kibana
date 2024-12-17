/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { AnalyticsServiceSetup } from '@kbn/core/public';
import type { RiskScoreService } from '../risk_score_service';
import { riskScoreServiceMock } from '../risk_score_service.mock';
import { riskScoringTaskMock } from './risk_scoring_task.mock';
import { riskEngineDataClientMock } from '../../risk_engine/risk_engine_data_client.mock';
import {
  registerRiskScoringTask,
  startRiskScoringTask,
  removeRiskScoringTask,
  runTask,
  getRiskScoringTaskStatus,
  scheduleNow,
} from './risk_scoring_task';
import type { ConfigType } from '../../../../config';
import { TaskStatus } from '@kbn/task-manager-plugin/server';

const ISO_8601_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;

const entityAnalyticsConfig = {
  riskEngine: {
    alertSampleSizePerShard: 10_000,
  },
} as unknown as ConfigType['entityAnalytics'];

describe('Risk Scoring Task', () => {
  let mockRiskEngineDataClient: ReturnType<typeof riskEngineDataClientMock.create>;
  let mockRiskScoreService: ReturnType<typeof riskScoreServiceMock.create>;
  let mockCore: ReturnType<typeof coreMock.createSetup>;
  let mockTaskManagerSetup: ReturnType<typeof taskManagerMock.createSetup>;
  let mockTaskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
  let mockLogger: ReturnType<typeof loggerMock.create>;
  let mockTelemetry: jest.Mocked<AnalyticsServiceSetup>;

  beforeEach(() => {
    mockCore = coreMock.createSetup();
    mockRiskEngineDataClient = riskEngineDataClientMock.create();
    mockRiskScoreService = riskScoreServiceMock.create();
    mockTaskManagerSetup = taskManagerMock.createSetup();
    mockTaskManagerStart = taskManagerMock.createStart();
    mockLogger = loggerMock.create();
    mockTelemetry = mockCore.analytics;
  });

  describe('registerRiskScoringTask()', () => {
    it('registers the task with TaskManager', () => {
      expect(mockTaskManagerSetup.registerTaskDefinitions).not.toHaveBeenCalled();
      registerRiskScoringTask({
        getStartServices: mockCore.getStartServices,
        kibanaVersion: '8.10.0',
        taskManager: mockTaskManagerSetup,
        logger: mockLogger,
        telemetry: mockTelemetry,
        entityAnalyticsConfig,
        auditLogger: undefined,
      });
      expect(mockTaskManagerSetup.registerTaskDefinitions).toHaveBeenCalled();
    });

    it('does nothing if TaskManager is not available', () => {
      expect(mockTaskManagerSetup.registerTaskDefinitions).not.toHaveBeenCalled();
      registerRiskScoringTask({
        getStartServices: mockCore.getStartServices,
        kibanaVersion: '8.10.0',
        taskManager: undefined,
        logger: mockLogger,
        telemetry: mockTelemetry,
        entityAnalyticsConfig,
        auditLogger: undefined,
      });
      expect(mockTaskManagerSetup.registerTaskDefinitions).not.toHaveBeenCalled();
    });
  });

  describe('startRiskScoringTask()', () => {
    it('schedules the task', async () => {
      await startRiskScoringTask({
        logger: mockLogger,
        namespace: 'default',
        taskManager: mockTaskManagerStart,
        riskEngineDataClient: mockRiskEngineDataClient,
      });

      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule: { interval: '1h' },
          taskType: 'risk_engine:risk_scoring',
        })
      );
    });

    it('schedules the task for a particular namespace', async () => {
      await startRiskScoringTask({
        logger: mockLogger,
        namespace: 'other',
        taskManager: mockTaskManagerStart,
        riskEngineDataClient: mockRiskEngineDataClient,
      });

      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule: { interval: '1h' },
          taskType: 'risk_engine:risk_scoring',
          state: expect.objectContaining({ namespace: 'other' }),
        })
      );
    });

    it('rethrows an error from taskManager', async () => {
      mockTaskManagerStart.ensureScheduled.mockRejectedValueOnce(new Error('whoops'));

      await expect(
        startRiskScoringTask({
          logger: mockLogger,
          namespace: 'other',
          taskManager: mockTaskManagerStart,
          riskEngineDataClient: mockRiskEngineDataClient,
        })
      ).rejects.toThrowError('whoops');
    });
  });

  describe('removeRiskScoringTask()', () => {
    it('removes the task', async () => {
      await removeRiskScoringTask({
        namespace: 'default',
        logger: mockLogger,
        taskManager: mockTaskManagerStart,
      });

      expect(mockTaskManagerStart.remove).toHaveBeenCalledWith(
        'risk_engine:risk_scoring:default:0.0.1'
      );
    });

    it('removes the task for a non-default namespace', async () => {
      await removeRiskScoringTask({
        namespace: 'other',
        logger: mockLogger,
        taskManager: mockTaskManagerStart,
      });

      expect(mockTaskManagerStart.remove).toHaveBeenCalledWith(
        'risk_engine:risk_scoring:other:0.0.1'
      );
    });

    it('does nothing if task was not found', async () => {
      mockTaskManagerStart.remove.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError('type', 'id')
      );
      await removeRiskScoringTask({
        namespace: 'default',
        logger: mockLogger,
        taskManager: mockTaskManagerStart,
      });

      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('rethrows errors other than "not found"', async () => {
      mockTaskManagerStart.remove.mockRejectedValueOnce(new Error('whoops'));

      await expect(
        removeRiskScoringTask({
          namespace: 'default',
          logger: mockLogger,
          taskManager: mockTaskManagerStart,
        })
      ).rejects.toThrowError('whoops');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to remove risk scoring task: whoops');
    });
  });

  describe('runTask()', () => {
    let riskScoringTaskInstanceMock: ReturnType<typeof riskScoringTaskMock.createInstance>;
    let getRiskScoreService: (namespace: string) => Promise<RiskScoreService>;
    let mockIsCancelled: jest.MockedFunction<() => boolean>;

    beforeEach(async () => {
      await startRiskScoringTask({
        logger: mockLogger,
        namespace: 'default',
        taskManager: mockTaskManagerStart,
        riskEngineDataClient: mockRiskEngineDataClient,
      });
      riskScoringTaskInstanceMock = riskScoringTaskMock.createInstance();
      mockRiskScoreService.getRiskInputsIndex.mockResolvedValueOnce({
        index: 'index',
        runtimeMappings: {},
      });
      mockRiskScoreService.getConfigurationWithDefaults.mockResolvedValue({
        dataViewId: 'data_view_id',
        enabled: true,
        filter: {},
        identifierType: 'host',
        interval: '1h',
        pageSize: 10_000,
        range: { start: 'now-30d', end: 'now' },
        alertSampleSizePerShard: 10_000,
      });
      mockIsCancelled = jest.fn().mockReturnValue(false);

      getRiskScoreService = jest.fn().mockResolvedValueOnce(mockRiskScoreService);
    });

    describe('when there are no scores to calculate', () => {
      beforeEach(() => {
        mockRiskScoreService.calculateAndPersistScores.mockResolvedValueOnce({
          after_keys: {},
          scores_written: 0,
          errors: [],
        });
      });

      it('invokes the risk score service only once', async () => {
        await runTask({
          getRiskScoreService,
          logger: mockLogger,
          taskInstance: riskScoringTaskInstanceMock,
          isCancelled: mockIsCancelled,
          telemetry: mockTelemetry,
          entityAnalyticsConfig,
        });
        expect(mockRiskScoreService.calculateAndPersistScores).toHaveBeenCalledTimes(1);
      });
    });

    describe('when there are scores to calculate', () => {
      beforeEach(() => {
        mockRiskScoreService.calculateAndPersistScores
          .mockResolvedValueOnce({
            after_keys: { host: { 'host.name': 'value' } },
            scores_written: 5,
            errors: [],
          })
          .mockResolvedValueOnce({
            after_keys: {},
            scores_written: 5,
            errors: [],
          });
      });

      it('retrieves configuration from the saved object', async () => {
        await runTask({
          getRiskScoreService,
          logger: mockLogger,
          taskInstance: riskScoringTaskInstanceMock,
          isCancelled: mockIsCancelled,
          telemetry: mockTelemetry,
          entityAnalyticsConfig,
        });

        expect(mockRiskScoreService.getConfigurationWithDefaults).toHaveBeenCalledTimes(1);
      });

      it('invokes the risk score service once for each page of scores', async () => {
        await runTask({
          getRiskScoreService,
          logger: mockLogger,
          taskInstance: riskScoringTaskInstanceMock,
          isCancelled: mockIsCancelled,
          telemetry: mockTelemetry,
          entityAnalyticsConfig,
        });
        expect(mockRiskScoreService.calculateAndPersistScores).toHaveBeenCalledTimes(2);
      });

      it('invokes the risk score service with the persisted configuration', async () => {
        mockRiskScoreService.getConfigurationWithDefaults.mockResolvedValueOnce({
          dataViewId: 'data_view_id',
          enabled: true,
          filter: {
            term: { 'host.name': 'SUSPICIOUS' },
          },
          identifierType: 'host',
          interval: '2h',
          pageSize: 11_111,
          range: { start: 'now-30d', end: 'now' },
          alertSampleSizePerShard: 10_000,
        });
        await runTask({
          getRiskScoreService,
          logger: mockLogger,
          taskInstance: riskScoringTaskInstanceMock,
          isCancelled: mockIsCancelled,
          telemetry: mockTelemetry,
          entityAnalyticsConfig,
        });

        expect(mockRiskScoreService.calculateAndPersistScores).toHaveBeenCalledWith(
          expect.objectContaining({
            filter: {
              term: { 'host.name': 'SUSPICIOUS' },
            },
            identifierType: 'host',
            pageSize: 11_111,
            range: {
              start: expect.stringMatching(ISO_8601_PATTERN),
              end: expect.stringMatching(ISO_8601_PATTERN),
            },
          })
        );
      });

      describe('when no identifier type is configured', () => {
        beforeEach(() => {
          mockRiskScoreService.getConfigurationWithDefaults.mockResolvedValue({
            dataViewId: 'data_view_id',
            enabled: true,
            filter: {},
            identifierType: undefined,
            interval: '1h',
            pageSize: 10_000,
            range: { start: 'now-30d', end: 'now' },
            alertSampleSizePerShard: 10_000,
          });
          // add additional mock responses for the additional identifier calls
          mockRiskScoreService.calculateAndPersistScores
            .mockResolvedValueOnce({
              after_keys: { host: { 'user.name': 'value' } },
              scores_written: 5,
              errors: [],
            })
            .mockResolvedValueOnce({
              after_keys: {},
              scores_written: 5,
              errors: [],
            });
        });

        it('invokes the risk score service once for type of identifier', async () => {
          await runTask({
            getRiskScoreService,
            logger: mockLogger,
            taskInstance: riskScoringTaskInstanceMock,
            isCancelled: mockIsCancelled,
            telemetry: mockTelemetry,
            entityAnalyticsConfig,
          });
          expect(mockRiskScoreService.calculateAndPersistScores).toHaveBeenCalledTimes(4);

          expect(mockRiskScoreService.calculateAndPersistScores).toHaveBeenCalledWith(
            expect.objectContaining({
              identifierType: 'host',
            })
          );
          expect(mockRiskScoreService.calculateAndPersistScores).toHaveBeenCalledWith(
            expect.objectContaining({
              identifierType: 'user',
            })
          );
        });
      });

      it('updates the task state', async () => {
        const { state: initialState } = riskScoringTaskInstanceMock;
        const { state: nextState } = await runTask({
          getRiskScoreService,
          logger: mockLogger,
          taskInstance: riskScoringTaskInstanceMock,
          isCancelled: mockIsCancelled,
          telemetry: mockTelemetry,
          entityAnalyticsConfig,
        });

        expect(initialState).not.toEqual(nextState);
        expect(nextState).toEqual(
          expect.objectContaining({
            runs: 1,
            scoresWritten: 10,
          })
        );
      });

      describe('short-circuiting', () => {
        it('does not execute if the risk engine is not enabled', async () => {
          mockRiskScoreService.getConfigurationWithDefaults.mockResolvedValueOnce({
            dataViewId: 'data_view_id',
            enabled: false,
            filter: {
              term: { 'host.name': 'SUSPICIOUS' },
            },
            identifierType: undefined,
            interval: '2h',
            pageSize: 11_111,
            range: { start: 'now-30d', end: 'now' },
            alertSampleSizePerShard: 10_000,
          });
          await runTask({
            getRiskScoreService,
            logger: mockLogger,
            taskInstance: riskScoringTaskInstanceMock,
            isCancelled: mockIsCancelled,
            telemetry: mockTelemetry,
            entityAnalyticsConfig,
          });

          expect(mockRiskScoreService.calculateAndPersistScores).not.toHaveBeenCalled();
          expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('not enabled'));
        });

        it('does not execute if the configuration is not found', async () => {
          mockRiskScoreService.getConfigurationWithDefaults.mockResolvedValueOnce(null);
          await runTask({
            getRiskScoreService,
            logger: mockLogger,
            taskInstance: riskScoringTaskInstanceMock,
            isCancelled: mockIsCancelled,
            telemetry: mockTelemetry,
            entityAnalyticsConfig,
          });

          expect(mockRiskScoreService.calculateAndPersistScores).not.toHaveBeenCalled();
          expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('configuration not found')
          );
        });

        it('does not execute if the riskScoreService is not available', async () => {
          await runTask({
            getRiskScoreService: jest.fn().mockResolvedValueOnce(undefined),
            logger: mockLogger,
            taskInstance: riskScoringTaskInstanceMock,
            isCancelled: mockIsCancelled,
            telemetry: mockTelemetry,
            entityAnalyticsConfig,
          });

          expect(mockRiskScoreService.calculateAndPersistScores).not.toHaveBeenCalled();
          expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('service is not available')
          );
        });
      });

      describe('when the task timeout has been exceeded', () => {
        beforeEach(() => {
          mockIsCancelled.mockReturnValue(true);
        });

        it('stops task execution', async () => {
          await runTask({
            getRiskScoreService,
            isCancelled: mockIsCancelled,
            logger: mockLogger,
            taskInstance: riskScoringTaskInstanceMock,
            telemetry: mockTelemetry,
            entityAnalyticsConfig,
          });

          expect(mockRiskScoreService.calculateAndPersistScores).not.toHaveBeenCalled();
        });

        it('logs that the task was cancelled', async () => {
          await runTask({
            getRiskScoreService,
            isCancelled: mockIsCancelled,
            logger: mockLogger,
            taskInstance: riskScoringTaskInstanceMock,
            telemetry: mockTelemetry,
            entityAnalyticsConfig,
          });

          expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('task was cancelled')
          );
        });
      });

      describe('when execution was successful', () => {
        it('send success telemetry event', async () => {
          await runTask({
            getRiskScoreService,
            isCancelled: mockIsCancelled,
            logger: mockLogger,
            taskInstance: riskScoringTaskInstanceMock,
            telemetry: mockTelemetry,
            entityAnalyticsConfig,
          });

          expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('risk_score_execution_success', {
            interval: '1h',
            scoresWritten: 10,
            taskDurationInSeconds: 0,
            alertSampleSizePerShard: 10000,
          });
        });

        it('schedules the transform to run now', async () => {
          await runTask({
            getRiskScoreService,
            isCancelled: mockIsCancelled,
            logger: mockLogger,
            taskInstance: riskScoringTaskInstanceMock,
            telemetry: mockTelemetry,
            entityAnalyticsConfig,
          });

          expect(mockRiskScoreService.scheduleLatestTransformNow).toHaveBeenCalledTimes(1);
        });

        it('refreshes the risk score index', async () => {
          await runTask({
            getRiskScoreService,
            isCancelled: mockIsCancelled,
            logger: mockLogger,
            taskInstance: riskScoringTaskInstanceMock,
            telemetry: mockTelemetry,
            entityAnalyticsConfig,
          });

          expect(mockRiskScoreService.refreshRiskScoreIndex).toHaveBeenCalledTimes(1);
        });
      });

      describe('when execution was unsuccessful', () => {
        beforeEach(() => {
          mockRiskScoreService.calculateAndPersistScores.mockReset();
          mockRiskScoreService.calculateAndPersistScores.mockImplementationOnce(() => {
            throw new Error();
          });
        });

        it('send error telemetry event', async () => {
          try {
            await runTask({
              getRiskScoreService,
              isCancelled: mockIsCancelled,
              logger: mockLogger,
              taskInstance: riskScoringTaskInstanceMock,
              telemetry: mockTelemetry,
              entityAnalyticsConfig,
            });
          } catch (err) {
            expect(mockTelemetry.reportEvent).toHaveBeenCalledTimes(1);
            expect(mockTelemetry.reportEvent).toHaveBeenCalledWith(
              'risk_score_execution_error',
              {}
            );
          }
        });

        it('does not schedules the transform to run now', async () => {
          await expect(
            runTask({
              getRiskScoreService,
              isCancelled: mockIsCancelled,
              logger: mockLogger,
              taskInstance: riskScoringTaskInstanceMock,
              telemetry: mockTelemetry,
              entityAnalyticsConfig,
            })
          ).rejects.toThrow();

          expect(mockRiskScoreService.scheduleLatestTransformNow).not.toHaveBeenCalled();
        });

        it('sends a cancellation telemetry event if the task was cancelled', async () => {
          mockIsCancelled.mockReturnValue(true);

          await runTask({
            getRiskScoreService,
            isCancelled: mockIsCancelled,
            logger: mockLogger,
            taskInstance: riskScoringTaskInstanceMock,
            telemetry: mockTelemetry,
            entityAnalyticsConfig,
          });

          expect(mockTelemetry.reportEvent).toHaveBeenCalledWith(
            'risk_score_execution_cancellation',
            {
              interval: '1h',
              scoresWritten: 0,
              taskDurationInSeconds: 0,
              alertSampleSizePerShard: 10000,
            }
          );
        });
      });
    });
  });

  describe('getRiskScoringTaskStatus()', () => {
    it('returns the task status', async () => {
      const runAt = new Date();
      const startedAt = new Date();
      mockTaskManagerStart.get.mockResolvedValueOnce(
        Promise.resolve({
          id: '123',
          scheduledAt: new Date(),
          attempts: 0,
          status: TaskStatus.Idle,
          startedAt,
          runAt,
          retryAt: new Date(),
          ownerId: null,
          taskType: 'test',
          params: {},
          state: {},
        })
      );

      const status = await getRiskScoringTaskStatus({
        taskManager: mockTaskManagerStart,
        namespace: 'default',
      });

      expect(status).toEqual({
        runAt: runAt.toISOString(),
        status: 'idle',
        startedAt: startedAt.toISOString(),
      });
    });
  });

  describe('scheduleNow()', () => {
    it('schedules the task to run now', async () => {
      await scheduleNow({
        taskManager: mockTaskManagerStart,
        logger: mockLogger,
        namespace: 'default',
      });

      expect(mockTaskManagerStart.runSoon).toHaveBeenCalledWith(
        'risk_engine:risk_scoring:default:0.0.1'
      );
    });

    it('logs an error if the task could not be scheduled', async () => {
      mockTaskManagerStart.runSoon.mockRejectedValueOnce(new Error('whoops'));

      await expect(
        scheduleNow({
          taskManager: mockTaskManagerStart,
          logger: mockLogger,
          namespace: 'default',
        })
      ).rejects.toThrowError('whoops');
    });
  });
});
