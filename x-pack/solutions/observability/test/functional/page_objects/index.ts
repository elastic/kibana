/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as tempFunctionalPageObjects } from '@kbn/test-suites-xpack/functional/page_objects';
import { pageObjects as kibanaFunctionalPageObjects } from '@kbn/test-suites-xpack-platform/functional/page_objects';
import { AssetDetailsProvider } from './asset_details';
import { InfraHomePageProvider } from './infra_home_page';
import { InfraHostsViewProvider } from './infra_hosts_view';
import { InfraLogsPageProvider } from './infra_logs_page';
import { InfraMetricsExplorerProvider } from './infra_metrics_explorer';
import { InfraSavedViewsProvider } from './infra_saved_views';
import { UptimePageObject } from './uptime_page';

// just like services, PageObjects are defined as a map of
// names to Providers. Merge in Kibana's or pick specific ones
export const pageObjects = {
  ...tempFunctionalPageObjects,
  ...kibanaFunctionalPageObjects,
  assetDetails: AssetDetailsProvider,
  infraHome: InfraHomePageProvider,
  infraHostsView: InfraHostsViewProvider,
  infraLogs: InfraLogsPageProvider,
  infraMetricsExplorer: InfraMetricsExplorerProvider,
  infraSavedViews: InfraSavedViewsProvider,
  uptime: UptimePageObject,
};
