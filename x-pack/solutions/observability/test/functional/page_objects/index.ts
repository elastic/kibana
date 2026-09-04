/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as platformPageObjects } from '@kbn/test-suites-xpack-platform/functional/page_objects';
import { InfraHomePageProvider } from './infra_home_page';
import { InfraLogsPageProvider } from './infra_logs_page';
import { InfraSavedViewsProvider } from './infra_saved_views';
import { UptimePageObject } from './uptime_page';
import { ObservabilityPageProvider } from './observability_page';
import { AlertControlsProvider } from './alert_controls';
import { ObservabilityLogsExplorerPageObject } from './observability_logs_explorer';

export const pageObjects = {
  ...platformPageObjects,
  alertControls: AlertControlsProvider,
  infraHome: InfraHomePageProvider,
  infraLogs: InfraLogsPageProvider,
  infraSavedViews: InfraSavedViewsProvider,
  observability: ObservabilityPageProvider,
  uptime: UptimePageObject,
  observabilityLogsExplorer: ObservabilityLogsExplorerPageObject,
};
