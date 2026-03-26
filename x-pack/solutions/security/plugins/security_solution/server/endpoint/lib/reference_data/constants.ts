/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MigrationMetadata,
  OrphanResponseActionsMetadata,
  ReferenceDataItemKey,
  ReferenceDataSavedObject,
} from './types';

export const REFERENCE_DATA_SAVED_OBJECT_TYPE = 'security:reference-data';

export const REF_DATA_KEYS = {
  /** V9.1 migration of artifacts state */
  spaceAwarenessArtifactMigration: 'SPACE-AWARENESS-ARTIFACT-MIGRATION',
  /** V9.1 migration of response actions state */
  spaceAwarenessResponseActionsMigration: 'SPACE-AWARENESS-RESPONSE-ACTIONS-MIGRATION',
  /**
   * Introduced with v9.1.0 in support of response action and spaces. Stores the space ID
   * where orphan response actions (those whose associated with a policy that has been deleted).
   */
  orphanResponseActionsSpace: 'ORPHAN-RESPONSE-ACTIONS-SPACE',
} as const;

/**
 * Definition of the initial record for each reference data key. This is used when the
 * reference data key is fetch for the first time.
 */
export const REF_DATA_KEY_INITIAL_VALUE: Readonly<
  Record<ReferenceDataItemKey, () => ReferenceDataSavedObject>
> = {
  [REF_DATA_KEYS.spaceAwarenessArtifactMigration]:
    (): ReferenceDataSavedObject<MigrationMetadata> => ({
      id: REF_DATA_KEYS.spaceAwarenessArtifactMigration,
      owner: 'EDR',
      type: 'MIGRATION',
      metadata: {
        started: new Date().toISOString(),
        finished: '',
        status: 'not-started',
        data: {},
      },
    }),

  [REF_DATA_KEYS.spaceAwarenessResponseActionsMigration]:
    (): ReferenceDataSavedObject<MigrationMetadata> => ({
      id: REF_DATA_KEYS.spaceAwarenessResponseActionsMigration,
      owner: 'EDR',
      type: 'MIGRATION',
      metadata: {
        started: new Date().toISOString(),
        finished: '',
        status: 'not-started',
        data: {},
      },
    }),

  [REF_DATA_KEYS.orphanResponseActionsSpace]:
    (): ReferenceDataSavedObject<OrphanResponseActionsMetadata> => ({
      id: REF_DATA_KEYS.orphanResponseActionsSpace,
      owner: 'EDR',
      type: 'RESPONSE-ACTIONS',
      metadata: { spaceId: '' },
    }),
};
