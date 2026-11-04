/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import type { ApplicationUsageResponse } from '../../../../common/types/usage';
import type { SearchContext } from '../../../lib/helpers/search';
import { searchAggregations } from '../../../lib/helpers/search';
import type { ApplicationSearchParams } from '../../application_tab_route';
import { USAGE_SEARCH_SPAN_NAME } from '../constants';
import { usageSearch } from './search_request';
import type { UsageAggregations } from './search_response';
import { toUsage } from './to_usage';

/** What users load and do in one EDOT Browser application, for the Overview's panels. */
export const getOtelUsage = ({
  esClient,
  signal,
  ...searchParams
}: ApplicationSearchParams & SearchContext): Promise<ApplicationUsageResponse> => {
  return withSpan(USAGE_SEARCH_SPAN_NAME, async () => {
    return toUsage(
      await searchAggregations<UsageAggregations>({ esClient, signal }, usageSearch(searchParams))
    );
  });
};
