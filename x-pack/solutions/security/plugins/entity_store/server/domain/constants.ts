/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EngineStatus } from './definitions/saved_objects';
import type { EntityStoreStatus } from './types';

export const ENTITY_LATEST = 'latest' as const;
export const ENTITY_UPDATES = 'updates' as const;

export const ENTITY_BASE_PREFIX = 'entities';

export const ENTITY_SCHEMA_VERSION_V2 = 'v2';

export const ECS_MAPPINGS_COMPONENT_TEMPLATE = 'ecs@mappings';

export const ENTITY_STORE_SOURCE_INDICES_PRIVILEGES = ['read', 'view_index_metadata'];
export const ENTITY_STORE_TARGET_INDICES_PRIVILEGES = ['read', 'manage'];
export const ENTITY_STORE_CLUSTER_PRIVILEGES = ['manage_index_templates'];

type SchemaVersion = `v${number}`;
type Dataset = typeof ENTITY_LATEST | typeof ENTITY_UPDATES;

interface IndexPatternOptions<TDataset extends Dataset> {
  dataset: TDataset;
  schemaVersion: SchemaVersion;
  namespace: string;
}

interface AliasPatternOptions<TDataset extends Dataset> {
  dataset: TDataset;
}

export const getEntityIndexPattern = <TDataset extends Dataset>({
  schemaVersion,
  dataset,
  namespace,
}: IndexPatternOptions<TDataset>) =>
  `.${ENTITY_BASE_PREFIX}.${schemaVersion}.${dataset}.security_${namespace}` as const;

export const getEntitiesAliasPattern = <TDataset extends Dataset>({
  dataset,
}: AliasPatternOptions<TDataset>) => `${ENTITY_BASE_PREFIX}-${dataset}` as const;

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
