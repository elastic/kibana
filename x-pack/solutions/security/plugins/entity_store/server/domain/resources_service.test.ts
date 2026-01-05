/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResourcesService } from './resources_service';
import { EntityType } from './definitions/constants';
import { ExtractEntityTask } from '../tasks/extract_entity_task';
import { EntityStoreLogger } from '../infra/logging';
import type { TaskManager } from '../types';

jest.mock('../tasks/extract_entity_task');

describe('ResourcesService', () => {
  let resourcesService: ResourcesService;
  let mockLogger: jest.Mocked<EntityStoreLogger>;
  let mockTaskManager: jest.Mocked<TaskManager>;
  let mockExtractEntityTask: jest.MockedClass<typeof ExtractEntityTask>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<EntityStoreLogger>;

    mockTaskManager = {
      registerTaskDefinitions: jest.fn(),
      ensureScheduled: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<TaskManager>;

    mockExtractEntityTask = ExtractEntityTask as jest.MockedClass<typeof ExtractEntityTask>;

    resourcesService = new ResourcesService(mockLogger);
  });

  describe('install', () => {
    // Verifies that install creates, registers, and schedules a task for each entity type provided
    it('should register and schedule tasks for each entity type', async () => {
      const types = [EntityType.Values.user, EntityType.Values.host];
      const mockTaskInstances = types.map((type) => {
        const mockTask = {
          register: jest.fn(),
          schedule: jest.fn().mockResolvedValue(undefined),
        };
        mockExtractEntityTask.mockImplementationOnce(
          () => mockTask as unknown as ExtractEntityTask
        );
        return mockTask;
      });

      await resourcesService.install(types, mockTaskManager);

      expect(mockExtractEntityTask).toHaveBeenCalledTimes(types.length);
      types.forEach((type, index) => {
        expect(mockExtractEntityTask).toHaveBeenNthCalledWith(
          index + 1,
          mockTaskManager,
          mockLogger,
          type
        );
      });

      mockTaskInstances.forEach((mockTask) => {
        expect(mockTask.register).toHaveBeenCalledTimes(1);
      });

      mockTaskInstances.forEach((mockTask) => {
        expect(mockTask.schedule).toHaveBeenCalledTimes(1);
      });
    });

    // Ensures install works correctly when only one entity type is provided
    it('should handle single entity type', async () => {
      const types = [EntityType.Values.service];
      const mockTask = {
        register: jest.fn(),
        schedule: jest.fn().mockResolvedValue(undefined),
      };
      mockExtractEntityTask.mockImplementationOnce(
        () => mockTask as unknown as ExtractEntityTask
      );

      await resourcesService.install(types, mockTaskManager);

      expect(mockExtractEntityTask).toHaveBeenCalledTimes(1);
      expect(mockExtractEntityTask).toHaveBeenCalledWith(
        mockTaskManager,
        mockLogger,
        EntityType.Values.service
      );
      expect(mockTask.register).toHaveBeenCalledTimes(1);
      expect(mockTask.schedule).toHaveBeenCalledTimes(1);
    });

    // Tests install with all available entity types to verify scalability
    it('should handle all entity types when multiple types provided', async () => {
      const types = [
        EntityType.Values.user,
        EntityType.Values.host,
        EntityType.Values.service,
        EntityType.Values.generic,
      ];
      const mockTaskInstances = types.map(() => {
        const mockTask = {
          register: jest.fn(),
          schedule: jest.fn().mockResolvedValue(undefined),
        };
        mockExtractEntityTask.mockImplementationOnce(
          () => mockTask as unknown as ExtractEntityTask
        );
        return mockTask;
      });

      await resourcesService.install(types, mockTaskManager);

      expect(mockExtractEntityTask).toHaveBeenCalledTimes(types.length);
      mockTaskInstances.forEach((mockTask) => {
        expect(mockTask.register).toHaveBeenCalledTimes(1);
        expect(mockTask.schedule).toHaveBeenCalledTimes(1);
      });
    });

    // Validates that install handles edge case of empty types array without errors
    it('should handle empty types array', async () => {
      const types: EntityType[] = [];

      await resourcesService.install(types, mockTaskManager);

      expect(mockExtractEntityTask).not.toHaveBeenCalled();
    });

    // Ensures registration errors bubble up to caller for proper error handling
    it('should propagate errors from task registration', async () => {
      const types = [EntityType.Values.user];
      const mockError = new Error('Registration failed');
      const mockTask = {
        register: jest.fn().mockImplementation(() => {
          throw mockError;
        }),
        schedule: jest.fn(),
      };
      mockExtractEntityTask.mockImplementationOnce(
        () => mockTask as unknown as ExtractEntityTask
      );

      await expect(resourcesService.install(types, mockTaskManager)).rejects.toThrow(
        'Registration failed'
      );

      expect(mockTask.register).toHaveBeenCalledTimes(1);
      expect(mockTask.schedule).not.toHaveBeenCalled();
    });

    // Ensures scheduling errors bubble up to caller for proper error handling
    it('should propagate errors from task scheduling', async () => {
      const types = [EntityType.Values.user];
      const mockError = new Error('Scheduling failed');
      const mockTask = {
        register: jest.fn(),
        schedule: jest.fn().mockRejectedValue(mockError),
      };
      mockExtractEntityTask.mockImplementationOnce(
        () => mockTask as unknown as ExtractEntityTask
      );

      await expect(resourcesService.install(types, mockTaskManager)).rejects.toThrow(
        'Scheduling failed'
      );

      expect(mockTask.register).toHaveBeenCalledTimes(1);
      expect(mockTask.schedule).toHaveBeenCalledTimes(1);
    });

    // Confirms that multiple tasks are registered and scheduled concurrently for better performance
    it('should execute registration and scheduling in parallel for multiple types', async () => {
      const types = [EntityType.Values.user, EntityType.Values.host];
      const schedulePromises: Array<Promise<void>> = [];
      const mockTaskInstances = types.map(() => {
        let resolveSchedule: () => void;
        const schedulePromise = new Promise<void>((resolve) => {
          resolveSchedule = resolve;
        });
        schedulePromises.push(schedulePromise);

        const mockTask = {
          register: jest.fn(),
          schedule: jest.fn().mockReturnValue(schedulePromise),
        };
        mockExtractEntityTask.mockImplementationOnce(
          () => mockTask as unknown as ExtractEntityTask
        );
        return { mockTask, resolveSchedule: resolveSchedule! };
      });

      const installPromise = resourcesService.install(types, mockTaskManager);

      mockTaskInstances.forEach(({ mockTask }) => {
        expect(mockTask.register).toHaveBeenCalledTimes(1);
      });

      mockTaskInstances.forEach(({ mockTask }) => {
        expect(mockTask.schedule).toHaveBeenCalledTimes(1);
      });

      mockTaskInstances.forEach(({ resolveSchedule }) => {
        resolveSchedule();
      });

      await installPromise;

      mockTaskInstances.forEach(({ mockTask }) => {
        expect(mockTask.schedule).toHaveBeenCalledTimes(1);
      });
    });
  });
});
