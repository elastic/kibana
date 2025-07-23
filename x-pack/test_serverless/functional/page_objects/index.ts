/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as xpackPlatformFunctionalPageObjects } from '@kbn/test-suites-xpack-platform/functional/page_objects';

import { cloudSecurityPosturePageObjects } from '@kbn/test-suites-xpack-security/cloud_security_posture_functional/page_objects';
import { SvlCommonPageProvider } from './svl_common_page';
import { SvlCommonNavigationProvider } from './svl_common_navigation';
import { SvlObltOverviewPageProvider } from './svl_oblt_overview_page';
import { SvlSearchLandingPageProvider } from './svl_search_landing_page';
import { SvlSecLandingPageProvider } from './svl_sec_landing_page';
import { SvlTriggersActionsPageProvider } from './svl_triggers_actions_ui_page';
import { SvlRuleDetailsPageProvider } from './svl_rule_details_ui_page';
import { SvlSearchConnectorsPageProvider } from './svl_search_connectors_page';
import { SvlManagementPageProvider } from './svl_management_page';
import { SvlIngestPipelines } from './svl_ingest_pipelines';
import { SvlSearchHomePageProvider } from './svl_search_homepage';
import { SvlSearchIndexDetailPageProvider } from './svl_search_index_detail_page';
import { SvlSearchElasticsearchStartPageProvider } from './svl_search_elasticsearch_start_page';
import { SvlApiKeysProvider } from './svl_api_keys';
import { SvlSearchCreateIndexPageProvider } from './svl_search_create_index_page';
import { SvlSearchInferenceManagementPageProvider } from './svl_search_inference_management_page';
import { SvlDataUsagePageProvider } from './svl_data_usage';
import { AssetDetailsProvider } from './asset_details';
import { ObservabilityLogsExplorerPageObject } from './observability_logs_explorer';
import { DatasetQualityPageObject } from './dataset_quality';
import { InfraHomePageProvider } from './infra_home_page';
import { InfraHostsViewProvider } from './infra_hosts_view';
import { InfraLogsPageProvider } from './infra_logs_page';
import { SearchSynonymsPageProvider } from './search_synonyms_page';
import { SearchQueryRulesPageProvider } from './search_query_rules_page';

export const pageObjects = {
  ...xpackPlatformFunctionalPageObjects,
  ...cloudSecurityPosturePageObjects,

  svlCommonPage: SvlCommonPageProvider,
  svlCommonNavigation: SvlCommonNavigationProvider,
  svlObltOverviewPage: SvlObltOverviewPageProvider,
  svlSearchConnectorsPage: SvlSearchConnectorsPageProvider,
  svlSearchLandingPage: SvlSearchLandingPageProvider,
  svlSecLandingPage: SvlSecLandingPageProvider,
  svlTriggersActionsUI: SvlTriggersActionsPageProvider,
  svlRuleDetailsUI: SvlRuleDetailsPageProvider,
  svlManagementPage: SvlManagementPageProvider,
  svlIngestPipelines: SvlIngestPipelines,
  svlSearchHomePage: SvlSearchHomePageProvider,
  svlSearchIndexDetailPage: SvlSearchIndexDetailPageProvider,
  svlSearchElasticsearchStartPage: SvlSearchElasticsearchStartPageProvider,
  svlApiKeys: SvlApiKeysProvider,
  svlSearchCreateIndexPage: SvlSearchCreateIndexPageProvider,
  svlSearchInferenceManagementPage: SvlSearchInferenceManagementPageProvider,
  svlDataUsagePage: SvlDataUsagePageProvider,
  assetDetails: AssetDetailsProvider,
  observabilityLogsExplorer: ObservabilityLogsExplorerPageObject,
  datasetQuality: DatasetQualityPageObject,
  infraHome: InfraHomePageProvider,
  infraHostsView: InfraHostsViewProvider,
  infraLogs: InfraLogsPageProvider,
  searchSynonyms: SearchSynonymsPageProvider,
  searchQueryRules: SearchQueryRulesPageProvider,
};
