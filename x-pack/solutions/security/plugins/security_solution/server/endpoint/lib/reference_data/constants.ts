/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import {
  ENDPOINT_ARTIFACT_LISTS,
  EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
} from '@kbn/securitysolution-list-constants';
import type { ExperimentalFeatures } from '../../../../common';
import type {
  MigrationMetadata,
  OptInStatusMetadata,
  OrphanResponseActionsMetadata,
  ReferenceDataItemKey,
  ReferenceDataSavedObject,
} from './types';
import { wrapErrorIfNeeded } from '../../utils';

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
  /**
   * v9.4.0: Per-policy opt-in status for Endpoint exceptions
   */
  endpointExceptionsPerPolicyOptInStatus: 'ENDPOINT-EXCEPTIONS-PER-POLICY-OPT-IN-STATUS',
} as const;

/**
 * Definition of the initial record for each reference data key. This is used when the
 * reference data key is fetch for the first time.
 */
export const REF_DATA_KEY_INITIAL_VALUE: Readonly<
  Record<
    ReferenceDataItemKey,
    (
      soClient: SavedObjectsClientContract,
      experimentalFeatures: ExperimentalFeatures
    ) => Promise<ReferenceDataSavedObject>
  >
> = {
  [REF_DATA_KEYS.spaceAwarenessArtifactMigration]: async (): Promise<
    ReferenceDataSavedObject<MigrationMetadata>
  > => ({
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

  [REF_DATA_KEYS.spaceAwarenessResponseActionsMigration]: async (): Promise<
    ReferenceDataSavedObject<MigrationMetadata>
  > => ({
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

  [REF_DATA_KEYS.orphanResponseActionsSpace]: async (): Promise<
    ReferenceDataSavedObject<OrphanResponseActionsMetadata>
  > => ({
    id: REF_DATA_KEYS.orphanResponseActionsSpace,
    owner: 'EDR',
    type: 'RESPONSE-ACTIONS',
    metadata: { spaceId: '' },
  }),

  [REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus]: async (
    soClient: SavedObjectsClientContract,
    experimentalFeatures: ExperimentalFeatures
  ): Promise<ReferenceDataSavedObject<OptInStatusMetadata>> => {
    let shouldAutomaticallyOptIn = false;

    if (experimentalFeatures.endpointExceptionsMovedUnderManagement) {
      try {
        const endpointExceptionList = await soClient.find({
          type: EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
          filter: `${EXCEPTION_LIST_NAMESPACE_AGNOSTIC}.attributes.list_id: ${ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id}`,
        });

        // we should opt-in the user automatically if:
        // - the FF is already enabled, AND
        // - Endpoint exception list does not exist, i.e. it's a new deployment
        shouldAutomaticallyOptIn = endpointExceptionList.total === 0;
      } catch (error) {
        throw wrapErrorIfNeeded(
          error,
          'Failed to retrieve Endpoint exceptions list while determining default per-policy opt-in status.'
        );
      }
    }

    if (shouldAutomaticallyOptIn) {
      return {
        id: REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus,
        owner: 'EDR',
        type: 'OPT-IN-STATUS',
        metadata: {
          status: true,
          reason: 'newDeployment',
          user: 'automatic-opt-in',
          timestamp: new Date().toISOString(),
        },
      };
    } else {
      return {
        id: REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus,
        owner: 'EDR',
        type: 'OPT-IN-STATUS',
        metadata: { status: false },
      };
    }
  },
};
