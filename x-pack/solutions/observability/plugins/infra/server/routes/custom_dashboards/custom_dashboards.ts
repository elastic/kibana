/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFramework } from '../../lib/adapters/framework/kibana_framework_adapter';
import { initGetCustomDashboardRoute } from './get_custom_dashboard';
import { initSaveCustomDashboardRoute } from './save_custom_dashboard';
import { initDeleteCustomDashboardRoute } from './delete_custom_dashboard';
import { initUpdateCustomDashboardRoute } from './update_custom_dashboard';

export function initCustomDashboardsRoutes(framework: KibanaFramework) {
  initGetCustomDashboardRoute(framework);
  initSaveCustomDashboardRoute(framework);
  initDeleteCustomDashboardRoute(framework);
  initUpdateCustomDashboardRoute(framework);
}
