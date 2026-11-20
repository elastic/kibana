/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { UseMutationOptions } from '@kbn/react-query';
import type { SyncRuleLibrariesResponseBody } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { SYNC_RULE_LIBRARIES_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { syncRuleLibraries } from '../../api';
import { useInvalidateFetchPrebuiltRulesInstallReviewQuery } from './use_fetch_prebuilt_rules_install_review_query';
import { useInvalidateFetchPrebuiltRulesStatusQuery } from './use_fetch_prebuilt_rules_status_query';
import { useInvalidateBrowseRuleLibraryQuery } from './use_browse_rule_library_query';
import { useInvalidateFetchRuleLibrariesQuery } from './use_fetch_rule_libraries_query';
import { useInvalidateFetchRuleLibraryTagsQuery } from './use_fetch_rule_library_tags_query';

export const SYNC_RULE_LIBRARIES_KEY = ['POST', SYNC_RULE_LIBRARIES_URL];

export interface UseSyncRuleLibrariesParams {
  // Omit to sync every library.
  libraryIds?: string[];
}

export const useSyncRuleLibrariesMutation = (
  options?: UseMutationOptions<SyncRuleLibrariesResponseBody, unknown, UseSyncRuleLibrariesParams>
) => {
  const invalidateRuleLibraries = useInvalidateFetchRuleLibrariesQuery();
  const invalidateBrowseRuleLibrary = useInvalidateBrowseRuleLibraryQuery();
  const invalidateRuleLibraryTags = useInvalidateFetchRuleLibraryTagsQuery();
  const invalidatePrebuiltRulesStatus = useInvalidateFetchPrebuiltRulesStatusQuery();
  const invalidateInstallReview = useInvalidateFetchPrebuiltRulesInstallReviewQuery();

  return useMutation<SyncRuleLibrariesResponseBody, unknown, UseSyncRuleLibrariesParams>(
    ({ libraryIds }) => syncRuleLibraries(libraryIds),
    {
      ...options,
      mutationKey: SYNC_RULE_LIBRARIES_KEY,
      onSettled: (...args) => {
        invalidateRuleLibraries();
        invalidateBrowseRuleLibrary();
        invalidateRuleLibraryTags();
        invalidatePrebuiltRulesStatus();
        invalidateInstallReview();

        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};
