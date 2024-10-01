/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as xpackFunctionalPageObjects } from '@kbn/test-suites-xpack/functional/page_objects';

import { cloudSecurityPosturePageObjects } from '@kbn/test-suites-xpack/cloud_security_posture_functional/page_objects';
import { SvlCommonPageProvider } from './svl_common_page';
import { SvlCommonNavigationProvider } from './svl_common_navigation';
import { SvlObltOnboardingPageProvider } from './svl_oblt_onboarding_page';
import { SvlObltOnboardingStreamLogFilePageProvider } from './svl_oblt_onboarding_stream_log_file';
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

export const pageObjects = {
  ...xpackFunctionalPageObjects,
  ...cloudSecurityPosturePageObjects,

  svlCommonPage: SvlCommonPageProvider,
  svlCommonNavigation: SvlCommonNavigationProvider,
  svlObltOnboardingPage: SvlObltOnboardingPageProvider,
  SvlObltOnboardingStreamLogFilePage: SvlObltOnboardingStreamLogFilePageProvider,
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
};
