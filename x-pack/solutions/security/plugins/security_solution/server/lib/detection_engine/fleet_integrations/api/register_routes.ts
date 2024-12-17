/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionPluginRouter } from '../../../../types';
import { getAllIntegrationsRoute } from './get_all_integrations/route';
import { getInstalledIntegrationsRoute } from './get_installed_integrations/route';

export const registerFleetIntegrationsRoutes = (router: SecuritySolutionPluginRouter) => {
  getAllIntegrationsRoute(router);
  getInstalledIntegrationsRoute(router);
};
