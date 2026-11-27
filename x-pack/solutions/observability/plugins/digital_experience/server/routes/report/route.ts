/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScorecardReport } from '../../../common/types/scorecard';
import { getScorecardReport } from '../../lib/report/get_scorecard_report';
import {
  APPLICATION_TAB_ROUTE_OPTIONS,
  APPLICATION_TAB_ROUTE_SECURITY,
  applicationTabRouteParams,
  toApplicationSearch,
} from '../application_tab_route';
import { createDigitalExperienceServerRoute } from '../create_digital_experience_server_route';

export const APPLICATION_SCORECARD_ENDPOINT =
  'GET /internal/digital_experience/applications/{serviceName}/report/scorecard' as const;

/** The scorecard report route, keyed by its endpoint; `plugin.ts` registers it. */
export const reportRouteRepository = createDigitalExperienceServerRoute({
  endpoint: APPLICATION_SCORECARD_ENDPOINT,
  options: APPLICATION_TAB_ROUTE_OPTIONS,
  security: APPLICATION_TAB_ROUTE_SECURITY,
  // The scorecard covers the whole application, so there are no filters to narrow it.
  params: applicationTabRouteParams,
  handler: async (resources): Promise<ScorecardReport> =>
    getScorecardReport(await toApplicationSearch(resources)),
});
