/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useQueryClient } from '@kbn/react-query';
import type { UseQueryOptions } from '@kbn/react-query';
import { useCallback } from 'react';
import type { ListRuleLibraryTagsResponseBody } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { LIST_RULE_LIBRARY_TAGS_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { fetchRuleLibraryTags } from '../../api';
import { DEFAULT_QUERY_OPTIONS } from '../constants';
import { retryUnlessClientError } from './retry_unless_client_error';

export const RULE_LIBRARY_TAGS_QUERY_KEY = ['GET', LIST_RULE_LIBRARY_TAGS_URL];

// Omit the library to get the tags of every library.
export const useFetchRuleLibraryTagsQuery = (
  libraryId?: string,
  options?: UseQueryOptions<ListRuleLibraryTagsResponseBody>
) =>
  useQuery<ListRuleLibraryTagsResponseBody>(
    [...RULE_LIBRARY_TAGS_QUERY_KEY, libraryId],
    ({ signal }) => fetchRuleLibraryTags({ libraryId, signal }),
    {
      ...DEFAULT_QUERY_OPTIONS,
      retry: retryUnlessClientError,
      ...options,
    }
  );

export const useInvalidateFetchRuleLibraryTagsQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(RULE_LIBRARY_TAGS_QUERY_KEY, { refetchType: 'active' });
  }, [queryClient]);
};
