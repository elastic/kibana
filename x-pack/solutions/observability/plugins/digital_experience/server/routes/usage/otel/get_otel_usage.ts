/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationUsageResponse } from '../../../../common/types/usage';
import type { ApplicationSearch } from '../../application_tab_route';
import { USAGE_SEARCH_SPAN_NAME } from '../constants';
import { usageSearch } from './search_request';
import { toUsage } from './to_usage';

/** What users load and do in one EDOT Browser application, for the Overview's panels. */
export const getOtelUsage = async ({
  esClient,
  ...searchParams
}: ApplicationSearch): Promise<ApplicationUsageResponse> => {
  const { aggregations } = await esClient.search(USAGE_SEARCH_SPAN_NAME, usageSearch(searchParams));
  return toUsage(aggregations);
};
