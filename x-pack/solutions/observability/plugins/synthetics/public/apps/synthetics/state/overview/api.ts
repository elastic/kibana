/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TrendRequest, TrendTable } from '../../../../../common/types';
import { apiService } from '../../../../utils/api_service';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';

export const fetchOverviewTrendStats = async (monitors: TrendRequest[]): Promise<TrendTable> =>
  monitors.length ? apiService.post(SYNTHETICS_API_URLS.OVERVIEW_TRENDS, monitors) : {};
