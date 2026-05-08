/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { apiService } from '../../../../utils/api_service/api_service';
import type { MonitorsHealthResponse } from './models';

export const fetchMonitorsHealth = async (
  monitorIds: string[]
): Promise<MonitorsHealthResponse> => {
  return await apiService.post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_HEALTH, {
    monitorIds,
  });
};
