/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useQueryClient } from '@kbn/react-query';
import type { UseQueryOptions } from '@kbn/react-query';
import { useCallback } from 'react';
import type { ListRuleLibrariesResponseBody } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { LIST_RULE_LIBRARIES_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { fetchRuleLibraries } from '../../api';
import { DEFAULT_QUERY_OPTIONS } from '../constants';

export const RULE_LIBRARIES_QUERY_KEY = ['GET', LIST_RULE_LIBRARIES_URL];

export const useFetchRuleLibrariesQuery = (
  options?: UseQueryOptions<ListRuleLibrariesResponseBody>
) =>
  useQuery<ListRuleLibrariesResponseBody>(
    RULE_LIBRARIES_QUERY_KEY,
    ({ signal }) => fetchRuleLibraries({ signal }),
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
    }
  );

export const useInvalidateFetchRuleLibrariesQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(
    () => queryClient.invalidateQueries(RULE_LIBRARIES_QUERY_KEY, { refetchType: 'active' }),
    [queryClient]
  );
};
