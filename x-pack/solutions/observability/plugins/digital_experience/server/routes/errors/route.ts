/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationErrorsResponse } from '../../../common/types/errors';
import {
  APPLICATION_TAB_ROUTE_OPTIONS,
  APPLICATION_TAB_ROUTE_SECURITY,
  documentFilteredApplicationTabRouteParams,
  toApplicationSearch,
} from '../application_tab_route';
import { createDigitalExperienceServerRoute } from '../create_digital_experience_server_route';
import { getOtelErrors } from './otel/get_otel_errors';

export const APPLICATION_ERRORS_ENDPOINT =
  'GET /internal/digital_experience/applications/{serviceName}/errors';

/** The Errors tab's route, keyed by its endpoint; `plugin.ts` registers it. */
export const errorsRouteRepository = createDigitalExperienceServerRoute({
  endpoint: APPLICATION_ERRORS_ENDPOINT,
  options: APPLICATION_TAB_ROUTE_OPTIONS,
  security: APPLICATION_TAB_ROUTE_SECURITY,
  params: documentFilteredApplicationTabRouteParams,
  handler: async (resources): Promise<ApplicationErrorsResponse> => {
    return getOtelErrors(await toApplicationSearch(resources));
  },
});
