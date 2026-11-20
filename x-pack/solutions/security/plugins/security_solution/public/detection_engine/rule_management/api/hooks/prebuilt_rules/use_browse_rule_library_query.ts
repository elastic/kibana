/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useQueryClient } from '@kbn/react-query';
import type { UseQueryOptions } from '@kbn/react-query';
import { useCallback } from 'react';
import type {
  BrowseRuleLibraryRequestBody,
  BrowseRuleLibraryResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { BROWSE_RULE_LIBRARY_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { browseRuleLibrary } from '../../api';
import { DEFAULT_QUERY_OPTIONS } from '../constants';
import { retryUnlessClientError } from './retry_unless_client_error';

export const BROWSE_RULE_LIBRARY_QUERY_KEY = ['POST', BROWSE_RULE_LIBRARY_URL];

export const useBrowseRuleLibraryQuery = (
  body: BrowseRuleLibraryRequestBody,
  options?: UseQueryOptions<BrowseRuleLibraryResponseBody>
) =>
  useQuery<BrowseRuleLibraryResponseBody>(
    [...BROWSE_RULE_LIBRARY_QUERY_KEY, body],
    ({ signal }) => browseRuleLibrary({ body, signal }),
    {
      ...DEFAULT_QUERY_OPTIONS,
      retry: retryUnlessClientError,
      ...options,
    }
  );

export const useInvalidateBrowseRuleLibraryQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(BROWSE_RULE_LIBRARY_QUERY_KEY, { refetchType: 'active' });
  }, [queryClient]);
};
