/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskRegisterDefinition } from '@kbn/task-manager-plugin/server';
import { EntityStoreTaskType } from './constants';

export interface TaskConfig extends Partial<TaskRegisterDefinition> {
  title: string;
  type: string;
  timeout: string;
  interval: string;
}

const config: Record<EntityStoreTaskType, TaskConfig> = {
  [EntityStoreTaskType.Values.extractEntity]: {
    title: 'Entity Store - Execute Entity Task',
    type: 'entity_store:v2:entity',
    timeout: '25s',
    interval: '30s',
  },
};

export default config;
