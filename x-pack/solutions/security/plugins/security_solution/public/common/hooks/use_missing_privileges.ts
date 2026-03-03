/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { RULES_FEATURE_ID } from '../../../common/constants';
import type { Privilege } from '../../detections/containers/detection_engine/alerts/types';
import { useUserPrivileges } from '../components/user_privileges';

const REQUIRED_INDEX_PRIVILEGES = ['read', 'write', 'view_index_metadata', 'manage'] as const;

const getIndexName = (indexPrivileges: Privilege['index']) => {
  const [indexName] = Object.keys(indexPrivileges);

  return indexName;
};

const getMissingIndexPrivileges = (
  indexPrivileges: Privilege['index']
): MissingIndexPrivileges | undefined => {
  const indexName = getIndexName(indexPrivileges);
  const privileges = indexPrivileges[indexName];
  const missingPrivileges = REQUIRED_INDEX_PRIVILEGES.filter((privilege) => !privileges[privilege]);

  if (missingPrivileges.length) {
    return [indexName, missingPrivileges];
  }
};

export type MissingFeaturePrivileges = [feature: string, privileges: string[]];
export type MissingIndexPrivileges = [indexName: string, privileges: string[]];

export interface MissingPrivileges {
  /**
   * List of features that the user does not have the privileges for.
   */
  featurePrivileges: MissingFeaturePrivileges[];
  /**
   * List of indices that the user does not have the privileges for.
   */
  indexPrivileges: MissingIndexPrivileges[];
}

/**
 * Hook that returns index and feature privileges that are missing for the user.
 */
export const useMissingPrivileges = (): MissingPrivileges => {
  const { detectionEnginePrivileges, listPrivileges, rulesPrivileges } = useUserPrivileges();

  return useMemo<MissingPrivileges>(() => {
    const featurePrivileges: MissingFeaturePrivileges[] = [];
    const indexPrivileges: MissingIndexPrivileges[] = [];

    if (listPrivileges.result == null || detectionEnginePrivileges.result == null) {
      /**
       * Do not check privileges till we get all the data. That helps to reduce
       * subsequent layout shift while loading and skip unneeded re-renders.
       */
      return {
        featurePrivileges,
        indexPrivileges,
      };
    }

    if (rulesPrivileges.rules.edit === false) {
      featurePrivileges.push([RULES_FEATURE_ID, ['all']]);
    }

    const missingItemsPrivileges = getMissingIndexPrivileges(listPrivileges.result.listItems.index);
    if (missingItemsPrivileges) {
      indexPrivileges.push(missingItemsPrivileges);
    }

    const missingListsPrivileges = getMissingIndexPrivileges(listPrivileges.result.lists.index);
    if (missingListsPrivileges) {
      indexPrivileges.push(missingListsPrivileges);
    }

    const missingDetectionPrivileges = getMissingIndexPrivileges(
      detectionEnginePrivileges.result.index
    );
    if (missingDetectionPrivileges) {
      indexPrivileges.push(missingDetectionPrivileges);
    }

    return {
      featurePrivileges,
      indexPrivileges,
    };
  }, [listPrivileges.result, detectionEnginePrivileges.result, rulesPrivileges.rules.edit]);
};
