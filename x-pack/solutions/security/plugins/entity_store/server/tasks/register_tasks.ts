/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_ENTITY_TYPES } from '../domain/definitions/entity_type';
import type { EntityStoreApiRequestHandlerContext } from '../types';

export function registerTasks(deps: Omit<EntityStoreApiRequestHandlerContext, 'core'>) {
  const extractEntitiesTask = deps.getExtractEntitiesTask();
  ALL_ENTITY_TYPES.forEach(extractEntitiesTask.schedule);
}
