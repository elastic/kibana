/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { OverviewStatusService } from './overview_status_service';
import type { SyntheticsRestApiRouteFactory } from '../types';
import type { OverviewStatusState } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { OverviewStatusSchema } from '../common';

export const createGetCurrentStatusRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.OVERVIEW_STATUS,
  validate: {
    query: OverviewStatusSchema,
  },
  handler: async (routeContext): Promise<OverviewStatusState> => {
    const statusOverview = new OverviewStatusService(routeContext);
    return await statusOverview.getOverviewStatus();
  },
});
