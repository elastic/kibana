/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ENTITY_LATEST = 'latest' as const;

export const ENTITY_BASE_PREFIX = 'entities';

export const ENTITY_SCHEMA_VERSION_V2 = 'v2';

export const ECS_MAPPINGS_COMPONENT_TEMPLATE = 'ecs@mappings';

type SchemaVersion = `v${number}`;
type Dataset = typeof ENTITY_LATEST;

interface IndexPatternOptions<TDataset extends Dataset> {
  dataset: TDataset;
  schemaVersion: SchemaVersion;
  definitionId: string;
}

interface AliasPatternOptions<TDataset extends Dataset> {
  dataset: TDataset;
  type: string;
}

export const getEntityIndexPattern = <TDataset extends Dataset>({
  schemaVersion,
  dataset,
  definitionId,
}: IndexPatternOptions<TDataset>) =>
  `.${ENTITY_BASE_PREFIX}.${schemaVersion}.${dataset}.${definitionId}` as const;

export const getEntitiesAliasPattern = <TDataset extends Dataset>({
  type,
  dataset,
}: AliasPatternOptions<TDataset>) => `${ENTITY_BASE_PREFIX}-${type}-${dataset}` as const;
