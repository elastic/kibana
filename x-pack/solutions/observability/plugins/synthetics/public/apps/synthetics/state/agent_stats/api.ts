/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocationAgentStats } from '../../../../../server/routes/settings/private_locations/get_agent_stats';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { apiService } from '../../../../utils/api_service/api_service';

export const fetchPrivateLocationAgentStats = async (): Promise<LocationAgentStats[]> => {
  return await apiService.get(SYNTHETICS_API_URLS.PRIVATE_LOCATION_AGENT_STATS);
};
