/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerCustomScriptsRoute } from './custom_scripts_handler';
import type { SecuritySolutionPluginRouter } from '../../../types';
import type { EndpointAppContext } from '../../types';

export const registerCustomScriptsRoutes = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  registerCustomScriptsRoute(router, endpointContext);
};
