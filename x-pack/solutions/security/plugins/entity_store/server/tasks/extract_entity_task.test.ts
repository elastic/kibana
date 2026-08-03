/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import { getNewSchedule } from './extract_entity_task';

const createTaskInstance = (schedule?: ConcreteTaskInstance['schedule']): ConcreteTaskInstance =>
  ({
    id: 'entity_store:v2:extract_entity_task:host:default',
    taskType: 'entity_store:v2:extract_entity_task:host',
    schedule,
  } as ConcreteTaskInstance);

describe('getNewSchedule', () => {
  it('returns a schedule when frequency differs from the current interval', () => {
    expect(getNewSchedule('22m', createTaskInstance({ interval: '1m' }))).toEqual({
      schedule: { interval: '22m' },
    });
  });

  it('returns undefined when frequency matches the current interval', () => {
    expect(getNewSchedule('1m', createTaskInstance({ interval: '1m' }))).toBeUndefined();
  });

  it('returns a schedule when the task has no interval', () => {
    expect(getNewSchedule('1m', createTaskInstance())).toEqual({
      schedule: { interval: '1m' },
    });
  });
});
