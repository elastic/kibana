/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { compact } from 'lodash';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { useBulkGetUserProfiles } from '../../../common/components/user_profiles/use_bulk_get_user_profiles';

interface UseRuleAuthorDisplayNamesArgs {
  createdBy?: string;
  createdByProfileUid?: string;
  updatedBy?: string;
  updatedByProfileUid?: string;
}

interface RuleAuthorDisplayNames {
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Resolves rule authorship to human-readable names, falling back to the raw `created_by` /
 * `updated_by` values when no profile uid is set or the profile cannot be resolved.
 */
export const useRuleAuthorDisplayNames = ({
  createdBy,
  createdByProfileUid,
  updatedBy,
  updatedByProfileUid,
}: UseRuleAuthorDisplayNamesArgs): RuleAuthorDisplayNames => {
  // Both uids go into a single bulkGet request instead of one request per author.
  const uids = useMemo(
    () => new Set(compact([createdByProfileUid, updatedByProfileUid])),
    [createdByProfileUid, updatedByProfileUid]
  );

  const { data: userProfiles } = useBulkGetUserProfiles({ uids });

  return useMemo(() => {
    const displayNameByUid = new Map(
      (userProfiles ?? []).map((profile) => [profile.uid, getUserDisplayName(profile.user)])
    );

    return {
      createdBy: createdByProfileUid
        ? displayNameByUid.get(createdByProfileUid) ?? createdBy
        : createdBy,
      updatedBy: updatedByProfileUid
        ? displayNameByUid.get(updatedByProfileUid) ?? updatedBy
        : updatedBy,
    };
  }, [userProfiles, createdBy, createdByProfileUid, updatedBy, updatedByProfileUid]);
};
