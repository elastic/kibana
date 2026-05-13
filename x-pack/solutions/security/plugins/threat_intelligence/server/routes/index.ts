/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import { registerDashboardOverviewRoute } from './dashboard_overview';
import { registerSavedViewsRoutes } from './saved_views';
import { registerSubmitSubscriptionRoute } from './submit_subscription';

export interface RouteRegistrationDeps {
  router: IRouter;
  logger: Logger;
  /**
   * Resolved during plugin start. Optional because the `spaces` plugin is
   * itself optional; route handlers fall back to `'default'` when it is
   * missing so the plugin still works on stripped-down test bootstraps.
   */
  getSpacesService: () => SpacesServiceStart | undefined;
}

export const registerRoutes = (deps: RouteRegistrationDeps): void => {
  registerSubmitSubscriptionRoute(deps);
  registerDashboardOverviewRoute(deps);
  registerSavedViewsRoutes(deps);
};
