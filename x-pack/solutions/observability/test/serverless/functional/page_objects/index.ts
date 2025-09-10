/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as svlPlatformPageObjects } from '@kbn/test-suites-xpack-platform/serverless/functional/page_objects';
import { SvlObltOverviewPageProvider } from './svl_oblt_overview_page';
import { ObservabilityLogsExplorerPageObject } from '../../../functional/page_objects/observability_logs_explorer';
import { DatasetQualityPageObject } from '../../../functional/page_objects/dataset_quality';
import { AssetDetailsProvider } from '../../../functional/page_objects/asset_details';
import { InfraHostsViewProvider } from '../../../functional/page_objects/infra_hosts_view';
import { InfraHomePageProvider } from '../../../functional/page_objects/infra_home_page';

export const pageObjects = {
  ...svlPlatformPageObjects,
  // Observability Solution stateful FTR page objects
  assetDetails: AssetDetailsProvider,
  datasetQuality: DatasetQualityPageObject,
  infraHostsView: InfraHostsViewProvider,
  infraHome: InfraHomePageProvider,
  observabilityLogsExplorer: ObservabilityLogsExplorerPageObject,
  // Observability Solution serverless FTR page objects
  svlObltOverviewPage: SvlObltOverviewPageProvider,
};
