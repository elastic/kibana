/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EngineStatus } from './saved_objects';
import type { EntityStoreStatus } from './types';

export const ECS_MAPPINGS_COMPONENT_TEMPLATE = 'ecs@mappings';
export const HASH_ALG = 'sha256' as const;

export const ENTITY_STORE_SOURCE_INDICES_PRIVILEGES = ['read', 'view_index_metadata'];
export const ENTITY_STORE_TARGET_INDICES_PRIVILEGES = ['read', 'manage'];
export const ENTITY_STORE_CLUSTER_PRIVILEGES = ['manage_index_templates'];

export const ENGINE_STATUS: Record<Uppercase<EngineStatus>, EngineStatus> = {
  INSTALLING: 'installing',
  STARTED: 'started',
  STOPPED: 'stopped',
  UPDATING: 'updating',
  ERROR: 'error',
};

export const ENTITY_STORE_STATUS: Record<Uppercase<EntityStoreStatus>, EntityStoreStatus> = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  INSTALLING: 'installing',
  NOT_INSTALLED: 'not_installed',
  ERROR: 'error',
};
