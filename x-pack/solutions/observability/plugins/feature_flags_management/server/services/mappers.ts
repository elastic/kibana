/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { App } from '../../common/schemas/apps';
import type { Credential } from '../../common/schemas/credentials';
import type { Environment } from '../../common/schemas/environments';
import type { CreatedBy, Flag, FlagDefinition } from '../../common/schemas/flags';
import type { StoredEntity, StoredFlagAttributes } from '../storage/definitions_repository';

const timestamps = ({
  created_at,
  updated_at,
  version,
}: StoredEntity<'flag' | 'app' | 'environment' | 'credential'>) => ({
  created_at,
  updated_at,
  version,
});

export const toEnvironment = (entity: StoredEntity<'environment'>): Environment => {
  const { key, name, description } = entity.attributes;
  return { key, name, description, ...timestamps(entity) };
};

export const toApp = (entity: StoredEntity<'app'>): App => {
  const { key, name, description } = entity.attributes;
  return { key, name, description, ...timestamps(entity) };
};

/** Never includes `sdk_key_hash`. */
export const toCredential = (entity: StoredEntity<'credential'>): Credential => {
  const { app, environment, client_id: clientId, sdk_key_hint: sdkKeyHint } = entity.attributes;
  return { app, environment, client_id: clientId, sdk_key_hint: sdkKeyHint, ...timestamps(entity) };
};

export const toFlagDefinition = ({
  environment,
  created_by: _createdBy,
  ...definition
}: StoredFlagAttributes): FlagDefinition => definition;

export const toStoredFlag = (
  definition: FlagDefinition,
  createdBy?: CreatedBy
): StoredFlagAttributes => ({
  ...definition,
  ...(createdBy ? { created_by: createdBy } : {}),
  environment: Object.keys(definition.environments),
});

export const toFlag = (entity: StoredEntity<'flag'>): Flag => ({
  ...toFlagDefinition(entity.attributes),
  ...(entity.attributes.created_by ? { created_by: entity.attributes.created_by } : {}),
  ...timestamps(entity),
});

/** Application-level snapshot for change history: what the API returns, minus the OCC version. */
export const toSnapshot = <T extends { version: string }>({
  version,
  ...snapshot
}: T): Omit<T, 'version'> => snapshot;
