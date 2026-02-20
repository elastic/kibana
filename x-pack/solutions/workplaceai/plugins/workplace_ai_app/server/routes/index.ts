/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from './types';
import {
  registerExchangeCodeRoute,
  registerRefreshTokenRoute,
  registerRevokeTokenRoute,
} from './ears';
import { registerGetInferenceEndpointsRoute } from './get_inference_endpoints';

export const registerRoutes = (dependencies: RouteDependencies) => {
  const { router, logger, config } = dependencies;
  registerGetInferenceEndpointsRoute(router);

  // EARS OAuth routes
  registerExchangeCodeRoute({ router, logger, config });
  registerRefreshTokenRoute({ router, logger, config });
  registerRevokeTokenRoute({ router, logger, config });
};
