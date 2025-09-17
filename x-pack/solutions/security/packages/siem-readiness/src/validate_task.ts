/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemReadinessTask } from './types';
import type { ReadinessTaskConfig } from './readiness_tasks';
import { READINESS_TASKS } from './readiness_tasks';

const validTaskIds = READINESS_TASKS.map((config) => config.id);
const validStatuses: SiemReadinessTask['status'][] = ['completed', 'incomplete'];

export const validateTask = (task: SiemReadinessTask): void => {
  const taskConfig: ReadinessTaskConfig | undefined = READINESS_TASKS.find(
    (config) => config.id === task.task_id
  );

  if (!taskConfig) {
    throw new Error(`Invalid task_id: ${task.task_id}. Must be one of: ${validTaskIds.join(', ')}`);
  }

  if (!validStatuses.includes(task.status)) {
    throw new Error(`Invalid status: ${task.status}. Must be one of: ${validStatuses.join(', ')}`);
  }

  const expectedMeta = taskConfig.meta;

  if (!expectedMeta && task.meta) {
    throw new Error(`Task ${task.task_id} should not have a meta field`);
  }

  if (expectedMeta) {
    if (!('meta' in task) || !task.meta) {
      throw new Error(`Task ${task.task_id} should have a meta field`);
    }

    const expectedFields = Object.keys(expectedMeta);

    if (typeof task.meta !== 'object') {
      throw new Error(
        `Meta must be an object for task ${
          task.task_id
        }, and include the fields ${expectedFields.join(', ')}`
      );
    }

    const taskMeta = task.meta; // Store reference for type safety
    const incomingTaskMetaFields = Object.keys(taskMeta);

    // Check for missing required fields
    expectedFields.forEach((field) => {
      if (!(field in taskMeta)) {
        throw new Error(`Missing required meta field: ${field} for task ${task.task_id}`);
      }

      // Check for correct type
      const expectedType = typeof expectedMeta[field];
      const taskMetaFieldType = typeof taskMeta[field];

      if (expectedType !== taskMetaFieldType) {
        throw new Error(
          `Invalid type for meta field: ${field} in task ${task.task_id}. Expected ${expectedType}, got ${taskMetaFieldType}`
        );
      }
    });

    // Check for extra fields
    const unexpectedExtraFields = incomingTaskMetaFields.filter(
      (field) => !expectedFields.includes(field)
    );

    if (unexpectedExtraFields.length > 0) {
      throw new Error(
        `Unexpected meta fields for task ${task.task_id}: ${unexpectedExtraFields.join(', ')}`
      );
    }
  }
};
