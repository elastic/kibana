/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateTask } from './validate_task';
import type { SiemReadinessTask } from './types';

// Mock the readiness tasks to avoid dependency on the actual file
jest.mock('./readiness_tasks', () => ({
  READINESS_TASKS: [
    {
      id: 'enable-endpoint-visibility',
      pillar: 'visibility',
      order: 1,
      meta: {
        agent_status: 'not-installed',
        endpoint_count: 0,
      },
    },
    {
      id: 'ingest-cloud-audit-logs',
      pillar: 'visibility',
      order: 2,
      meta: {
        cloud_provider: ['aws', 'gcp'],
        log_count: 0,
      },
    },
    {
      id: 'no-meta-task',
      pillar: 'detection',
      order: 3,
      // No meta field defined
    },
    {
      id: 'empty-meta-task',
      pillar: 'response',
      order: 4,
      meta: {},
    },
  ],
}));

describe('validateTask', () => {
  describe('valid tasks', () => {
    it('should validate a complete task with all required meta fields', () => {
      const task: SiemReadinessTask = {
        task_id: 'enable-endpoint-visibility',
        status: 'completed',
        meta: {
          agent_status: 'healthy',
          endpoint_count: 5,
        },
      };

      expect(() => validateTask(task)).not.toThrow();
    });

    it('should validate a task with cloud provider array', () => {
      const task: SiemReadinessTask = {
        task_id: 'ingest-cloud-audit-logs',
        status: 'completed',
        meta: {
          cloud_provider: ['aws', 'azure'],
          log_count: 100,
        },
      };

      expect(() => validateTask(task)).not.toThrow();
    });

    it('should validate a task with incomplete status', () => {
      const task: SiemReadinessTask = {
        task_id: 'enable-endpoint-visibility',
        status: 'incomplete',
        meta: {
          agent_status: 'unhealthy',
          endpoint_count: 0,
        },
      };

      expect(() => validateTask(task)).not.toThrow();
    });

    it('should validate a task with no meta requirements', () => {
      const task: SiemReadinessTask = {
        task_id: 'no-meta-task',
        status: 'completed',
      };

      expect(() => validateTask(task)).not.toThrow();
    });

    it('should validate a task with empty meta requirements', () => {
      const task: SiemReadinessTask = {
        task_id: 'empty-meta-task',
        status: 'completed',
        meta: {},
      };

      expect(() => validateTask(task)).not.toThrow();
    });
  });

  describe('invalid task_id', () => {
    it('should throw error for non-existent task_id', () => {
      const task: SiemReadinessTask = {
        task_id: 'non-existent-task' as never,
        status: 'completed',
        meta: {},
      };

      expect(() => validateTask(task)).toThrow(
        'Invalid task_id: non-existent-task. Must be one of: enable-endpoint-visibility, ingest-cloud-audit-logs, no-meta-task, empty-meta-task'
      );
    });
  });

  describe('invalid status', () => {
    it('should throw error for invalid status', () => {
      const task: SiemReadinessTask = {
        task_id: 'enable-endpoint-visibility',
        status: 'in-progress' as never,
        meta: {
          agent_status: 'healthy',
          endpoint_count: 123,
        },
      };

      expect(() => validateTask(task)).toThrow(
        'Invalid status: in-progress. Must be one of: completed, incomplete'
      );
    });
  });

  describe('meta validation errors', () => {
    it('should throw error when meta is missing but required', () => {
      const task: SiemReadinessTask = {
        task_id: 'enable-endpoint-visibility',
        status: 'completed',
        // meta is missing
      };

      expect(() => validateTask(task)).toThrow(
        'Task enable-endpoint-visibility should have a meta field'
      );
    });

    it('should throw error when meta is not an object', () => {
      const task: SiemReadinessTask = {
        task_id: 'enable-endpoint-visibility',
        status: 'completed',
        meta: 'invalid' as never,
      };

      expect(() => validateTask(task)).toThrow(
        'Meta must be an object for task enable-endpoint-visibility, and include the fields agent_status, endpoint_count'
      );
    });

    it('should throw error for missing required meta field', () => {
      const task: SiemReadinessTask = {
        task_id: 'ingest-cloud-audit-logs',
        status: 'completed',
        meta: {
          cloud_provider: ['aws'],
          // log_count is missing
        },
      };

      expect(() => validateTask(task)).toThrow(
        'Missing required meta field: log_count for task ingest-cloud-audit-logs'
      );
    });

    it('should throw error for incorrect meta field type', () => {
      const task: SiemReadinessTask = {
        task_id: 'ingest-cloud-audit-logs',
        status: 'completed',
        meta: {
          cloud_provider: 'aws', // should be array, not string
          log_count: 50,
        },
      };

      expect(() => validateTask(task)).toThrow(
        'Invalid type for meta field: cloud_provider in task ingest-cloud-audit-logs. Expected object, got string'
      );
    });

    it('should throw error for extra meta fields', () => {
      const task: SiemReadinessTask = {
        task_id: 'enable-endpoint-visibility',
        status: 'completed',
        meta: {
          agent_status: 'healthy',
          endpoint_count: 123,
          extra_field: 'not allowed',
        },
      };

      expect(() => validateTask(task)).toThrow(
        'Unexpected meta fields for task enable-endpoint-visibility: extra_field'
      );
    });
  });
});
