/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResourcesService } from './resources_service';
import { EntityType } from './definitions/entity_type';
import type { Logger } from '@kbn/logging';
import type { TaskManagers } from '../tasks/task_manager';
import * as extractEntityTaskModule from '../tasks/extract_entity_task';

jest.mock('../tasks/extract_entity_task');

describe('ResourcesService', () => {
  let resourcesService: ResourcesService;
  let mockLogger: jest.Mocked<Logger>;
  let mockTaskManagers: jest.Mocked<TaskManagers>;
  let mockScheduleExtractEntityTasks: jest.MockedFunction<typeof extractEntityTaskModule.scheduleExtractEntityTasks>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    const mockTaskManagerStart = {
      ensureScheduled: jest.fn().mockResolvedValue({}),
    };

    mockTaskManagers = {
      taskManagerSetup: {} as any,
      taskManagerStart: mockTaskManagerStart as any,
    } as unknown as jest.Mocked<TaskManagers>;

    mockScheduleExtractEntityTasks = extractEntityTaskModule.scheduleExtractEntityTasks as jest.MockedFunction<typeof extractEntityTaskModule.scheduleExtractEntityTasks>;
    mockScheduleExtractEntityTasks.mockResolvedValue(undefined);

    resourcesService = new ResourcesService(mockLogger, mockTaskManagers);
  });

  describe('install', () => {
    // Verifies that install creates and schedules a task for each entity type provided
    it('should create and schedule tasks for each entity type', async () => {
      const types = [EntityType.Values.user, EntityType.Values.host];

      await resourcesService.install(types);

      expect(mockScheduleExtractEntityTasks).toHaveBeenCalledTimes(1);
      expect(mockScheduleExtractEntityTasks).toHaveBeenCalledWith({
        taskManager: mockTaskManagers.taskManagerStart,
        logger: mockLogger,
        entityTypes: types,
      });
    });

    // Ensures install works correctly when only one entity type is provided
    it('should handle single entity type', async () => {
      const types = [EntityType.Values.service];

      await resourcesService.install(types);

      expect(mockScheduleExtractEntityTasks).toHaveBeenCalledTimes(1);
      expect(mockScheduleExtractEntityTasks).toHaveBeenCalledWith({
        taskManager: mockTaskManagers.taskManagerStart,
        logger: mockLogger,
        entityTypes: types,
      });
    });

    // Tests install with all available entity types to verify scalability
    it('should handle all entity types when multiple types provided', async () => {
      const types = [
        EntityType.Values.user,
        EntityType.Values.host,
        EntityType.Values.service,
        EntityType.Values.generic,
      ];

      await resourcesService.install(types);

      expect(mockScheduleExtractEntityTasks).toHaveBeenCalledTimes(1);
      expect(mockScheduleExtractEntityTasks).toHaveBeenCalledWith({
        taskManager: mockTaskManagers.taskManagerStart,
        logger: mockLogger,
        entityTypes: types,
      });
    });

    // Validates that install handles edge case of empty types array without errors
    it('should handle empty types array', async () => {
      const types: EntityType[] = [];

      await resourcesService.install(types);

      expect(mockScheduleExtractEntityTasks).toHaveBeenCalledTimes(1);
      expect(mockScheduleExtractEntityTasks).toHaveBeenCalledWith({
        taskManager: mockTaskManagers.taskManagerStart,
        logger: mockLogger,
        entityTypes: types,
      });
    });

    // Ensures scheduling errors bubble up to caller for proper error handling
    it('should propagate errors from task scheduling', async () => {
      const types = [EntityType.Values.user];
      const mockError = new Error('Scheduling failed');
      mockScheduleExtractEntityTasks.mockRejectedValueOnce(mockError);

      await expect(resourcesService.install(types)).rejects.toThrow('Scheduling failed');

      expect(mockScheduleExtractEntityTasks).toHaveBeenCalledTimes(1);
      expect(mockScheduleExtractEntityTasks).toHaveBeenCalledWith({
        taskManager: mockTaskManagers.taskManagerStart,
        logger: mockLogger,
        entityTypes: types,
      });
    });

    // Verifies that install calls scheduleExtractEntityTasks with correct parameters
    it('should call scheduleExtractEntityTasks with correct parameters', async () => {
      const types = [EntityType.Values.user, EntityType.Values.host];
      let resolveSchedule: () => void;
      const schedulePromise = new Promise<void>((resolve) => {
        resolveSchedule = resolve;
      });
      mockScheduleExtractEntityTasks.mockReturnValueOnce(schedulePromise);

      const installPromise = resourcesService.install(types);

      expect(mockScheduleExtractEntityTasks).toHaveBeenCalledTimes(1);
      expect(mockScheduleExtractEntityTasks).toHaveBeenCalledWith({
        taskManager: mockTaskManagers.taskManagerStart,
        logger: mockLogger,
        entityTypes: types,
      });

      resolveSchedule!();
      await installPromise;
    });
  });
});
