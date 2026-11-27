/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { KibanaServices } from '../../../common/lib/kibana';
import { RULE_MANAGEMENT_RULE_SEARCH_STATUS_URL } from '../../../../common/api/detection_engine/rule_management/urls';
import type { RuleSearchBoxMode } from '../../rule_management/logic/types';

/**
 * `unavailable`: only the keyword search (AI features off, no models or no Workflows); `off`: an
 * admin has not turned the rule search index workflow on; `indexing`: its first run is going on.
 */
export type RuleSearchStatus = 'unavailable' | 'off' | 'indexing' | 'ready';

const INDEXING_POLL_MS = 15_000;

export const useRuleSearchStatus = (): RuleSearchStatus => {
  const { data } = useQuery(
    ['GET', RULE_MANAGEMENT_RULE_SEARCH_STATUS_URL],
    ({ signal }) =>
      KibanaServices.get().http.fetch<{ status: RuleSearchStatus }>(
        RULE_MANAGEMENT_RULE_SEARCH_STATUS_URL,
        { method: 'GET', version: '1', signal }
      ),
    {
      staleTime: 30_000,
      refetchInterval: (response) => (response?.status === 'indexing' ? INDEXING_POLL_MS : false),
    }
  );
  return data?.status ?? 'unavailable';
};

/** What the search box does: the user's choice when AI search is ready, Keyword otherwise. */
export const searchBoxMode = (
  status: RuleSearchStatus,
  chosen: RuleSearchBoxMode | undefined
): RuleSearchBoxMode => (status === 'ready' ? chosen ?? 'ai' : 'keyword');
