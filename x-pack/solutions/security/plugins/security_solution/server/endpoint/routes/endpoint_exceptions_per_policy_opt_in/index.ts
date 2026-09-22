/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionPluginRouter } from '../../../types';
import type { EndpointAppContext } from '../../types';
import { registerEndpointExceptionsPerPolicyOptInRoute } from './endpoint_exceptions_per_policy_opt_in';

export const registerEndpointExceptionsRoutes = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  if (endpointContext.experimentalFeatures.endpointExceptionsMovedUnderManagement) {
    registerEndpointExceptionsPerPolicyOptInRoute(router, endpointContext);
  }
};
