/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as xpackFunctionalPageObjects } from '@kbn/test-suites-xpack/functional/page_objects';

import { SvlCommonPageProvider } from '@kbn/test-suites-xpack-platform/serverless/functional/page_objects/svl_common_page';
import { SvlCommonNavigationProvider } from '@kbn/test-suites-xpack-platform/serverless/functional/page_objects/svl_common_navigation';
import { SvlManagementPageProvider } from '@kbn/test-suites-xpack-platform/serverless/functional/page_objects/svl_management_page';
import { SvlIngestPipelines } from '@kbn/test-suites-xpack-platform/serverless/functional/page_objects/svl_ingest_pipelines';
import { SvlApiKeysProvider } from '@kbn/test-suites-xpack-platform/serverless/functional/page_objects/svl_api_keys';
import { SvlDataUsagePageProvider } from '@kbn/test-suites-xpack-platform/serverless/functional/page_objects/svl_data_usage';
import { SvlCustomRolesPageProvider } from '@kbn/test-suites-xpack-platform/serverless/functional/page_objects/svl_custom_roles_page';
import { SvlRuleDetailsPageProvider } from '@kbn/test-suites-xpack-platform/serverless/functional/page_objects/svl_rule_details_ui_page';
import { SvlTriggersActionsPageProvider } from '@kbn/test-suites-xpack-platform/serverless/functional/page_objects/svl_triggers_actions_ui_page';
import { SvlObltOverviewPageProvider } from './svl_oblt_overview_page';
import { SvlSearchLandingPageProvider } from './svl_search_landing_page';
import { SvlSecLandingPageProvider } from './svl_sec_landing_page';
import { SvlSearchConnectorsPageProvider } from './svl_search_connectors_page';
import { SvlSearchHomePageProvider } from './svl_search_homepage';
import { SvlSearchIndexDetailPageProvider } from './svl_search_index_detail_page';
import { SvlSearchElasticsearchStartPageProvider } from './svl_search_elasticsearch_start_page';
import { SvlSearchCreateIndexPageProvider } from './svl_search_create_index_page';
import { SvlSearchInferenceManagementPageProvider } from './svl_search_inference_management_page';
import { CspDashboardPageProvider } from './csp_dashboard_page';
import { AddCisIntegrationFormPageProvider } from './add_cis_integration_form_page';
import { CspSecurityCommonProvider } from './security_common';

export const pageObjects = {
  ...xpackFunctionalPageObjects,

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
  svlCustomRolesPage: SvlCustomRolesPageProvider,
  // Cloud Security Posture specific page objects
  cloudPostureDashboard: CspDashboardPageProvider,
  cisAddIntegration: AddCisIntegrationFormPageProvider,
  cspSecurity: CspSecurityCommonProvider,
};
