/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ENTITY_LATEST = 'latest' as const;
export const ENTITY_UPDATES = 'updates' as const;
export const ENTITY_HISTORY = 'history' as const;

export const ENTITY_BASE_PREFIX = 'entities';

export const ENTITY_SCHEMA_VERSION_V2 = 'v2';

type SchemaVersion = `v${number}`;
type Dataset = typeof ENTITY_LATEST | typeof ENTITY_UPDATES | typeof ENTITY_HISTORY;

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

export const getLatestEntitiesIndexName = (namespace: string) =>
  getEntityIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V2,
    dataset: ENTITY_LATEST,
    namespace,
  });
