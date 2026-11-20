/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { UseMutationOptions } from '@kbn/react-query';
import type {
  CreateRuleLibraryRequestBody,
  CreateRuleLibraryResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { CREATE_RULE_LIBRARY_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { createRuleLibrary } from '../../api';
import { useInvalidateFetchRuleLibrariesQuery } from './use_fetch_rule_libraries_query';

export const CREATE_RULE_LIBRARY_KEY = ['POST', CREATE_RULE_LIBRARY_URL];

export const useCreateRuleLibraryMutation = (
  options?: UseMutationOptions<CreateRuleLibraryResponseBody, unknown, CreateRuleLibraryRequestBody>
) => {
  const invalidateRuleLibraries = useInvalidateFetchRuleLibrariesQuery();

  return useMutation<CreateRuleLibraryResponseBody, unknown, CreateRuleLibraryRequestBody>(
    createRuleLibrary,
    {
      ...options,
      mutationKey: CREATE_RULE_LIBRARY_KEY,
      // Waits for the list to reload, so the new library is there when the caller continues.
      onSuccess: async (...args) => {
        await invalidateRuleLibraries();
        await options?.onSuccess?.(...args);
      },
    }
  );
};
