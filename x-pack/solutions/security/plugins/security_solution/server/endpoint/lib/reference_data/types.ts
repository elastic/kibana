/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A union of all valid `owner` values for reference data entries */
export type ReferenceDataOwner = 'EDR';

/**
 * List of allowed `key`'s of reference data items.
 * Use the `REF_DATA_KEYS` object from `./constants` to reference these in code.
 */
export type ReferenceDataItemKey =
  | 'SPACE-AWARENESS-ARTIFACT-MIGRATION'
  | 'SPACE-AWARENESS-RESPONSE-ACTIONS-MIGRATION'
  | 'ORPHAN-RESPONSE-ACTIONS-SPACE';

export interface ReferenceDataSavedObject<Meta extends object = {}> {
  id: ReferenceDataItemKey;
  type: string;
  owner: ReferenceDataOwner;
  metadata: Meta;
}

export interface ReferenceDataClientInterface {
  get<TMeta extends object = {}>(
    refDataKey: ReferenceDataItemKey
  ): Promise<ReferenceDataSavedObject<TMeta>>;

  update<TMeta extends object = {}>(
    refDataKey: ReferenceDataItemKey,
    data: ReferenceDataSavedObject<TMeta>
  ): Promise<ReferenceDataSavedObject<TMeta>>;

  delete(refDataKey: ReferenceDataItemKey): Promise<void>;
}

export interface MigrationMetadata {
  started: string;
  finished: string;
  status: 'not-started' | 'complete' | 'pending';
  data?: unknown;
}

export interface OrphanResponseActionsMetadata {
  spaceId: string;
}
