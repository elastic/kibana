/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UseQueryOptions } from '@kbn/react-query';
import type {
  GetRuleLibraryRuleRequestQuery,
  GetRuleLibraryRuleResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { GET_RULE_LIBRARY_RULE_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { fetchRuleLibraryRule } from '../../api';
import { DEFAULT_QUERY_OPTIONS } from '../constants';
import { retryUnlessClientError } from './retry_unless_client_error';

export const RULE_LIBRARY_RULE_QUERY_KEY = ['GET', GET_RULE_LIBRARY_RULE_URL];

export const useFetchRuleLibraryRuleQuery = (
  query: GetRuleLibraryRuleRequestQuery,
  options?: UseQueryOptions<GetRuleLibraryRuleResponseBody>
) =>
  useQuery<GetRuleLibraryRuleResponseBody>(
    [...RULE_LIBRARY_RULE_QUERY_KEY, query],
    ({ signal }) => fetchRuleLibraryRule({ query, signal }),
    {
      ...DEFAULT_QUERY_OPTIONS,
      retry: retryUnlessClientError,
      ...options,
    }
  );
