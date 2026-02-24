/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntervalSchedule, TaskRegisterDefinition } from '@kbn/task-manager-plugin/server';
import { EntityStoreTaskType } from './constants';

type TaskScheduleConfig = Omit<TaskRegisterDefinition, 'createTaskRunner'> &
  Partial<IntervalSchedule>;

export interface EntityStoreTaskConfig extends TaskScheduleConfig {
  type: string;
}

export const TasksConfig: Record<EntityStoreTaskType, EntityStoreTaskConfig> = {
  [EntityStoreTaskType.enum.extractEntity]: {
    title: 'Entity Store - Execute Entity Task',
    type: 'entity_store:v2:extract_entity_task',
    timeout: '25s',
    interval: '30s',
  },
  [EntityStoreTaskType.enum.entityMaintainer]: {
    title: 'Entity Store - Entity Maintainer Task',
    type: 'entity_store:v2:entity_maintainer_task',
  },
  [EntityStoreTaskType.enum.historySnapshot]: {
    title: 'Entity Store - History Snapshot Task',
    type: 'entity_store:v2:history_snapshot_task',
    timeout: '30m',
  },
  [EntityStoreTaskType.enum.storeUsage]: {
    title: 'Entity Store - Store Usage Task',
    type: 'entity_store:v2:store_usage_task',
    timeout: '25s',
    interval: '1h',
  },
};
