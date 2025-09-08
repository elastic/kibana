/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemReadinessTask } from '..';
import { READINESS_TASKS } from './readiness_tasks';

const validTaskIds = READINESS_TASKS.map((config) => config.id);
const validStatuses: SiemReadinessTask['status'][] = ['complete', 'incomplete'];

export const validateTask = (task: SiemReadinessTask): void => {
  // Find task
  const taskConfig = READINESS_TASKS.find((config) => config.id === task.task_id);

  if (!taskConfig) {
    throw new Error(`Invalid task_id: ${task.task_id}. Must be one of: ${validTaskIds.join(', ')}`);
  }

  // Validate status
  if (!validStatuses.includes(task.status)) {
    throw new Error(`Invalid status: ${task.status}. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate meta structure
  const expectedMetaFields = taskConfig.meta;

  if (expectedMetaFields) {
    const expectedFields = Object.keys(expectedMetaFields);

    if (!task.meta || typeof task.meta !== 'object') {
      throw new Error(
        `Meta must be an object for task ${
          task.task_id
        }, and include the fields ${expectedFields.join(', ')}`
      );
    }

    const incomingTaskMetaFields = Object.keys(task.meta);

    // Check for missing required fields
    expectedFields.forEach((field) => {
      if (!(field in task.meta)) {
        throw new Error(`Missing required meta field: ${field} for task ${task.task_id}`);
      }

      // Check for correct type
      const expectedType = typeof expectedMetaFields[field];
      const taskMetaFieldType = typeof task.meta[field];

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
        `Extra meta fields not allowed: ${unexpectedExtraFields.join(', ')} for task ${
          task.task_id
        }`
      );
    }
  }
};
