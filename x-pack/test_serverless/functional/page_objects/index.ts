/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { pageObjects as xpackFunctionalPageObjects } from '../../../test/functional/page_objects';
import { SvlCommonPageProvider } from './svl_common_page';
import { SvlCommonNavigationProvider } from './svl_common_navigation';
import { SvlObltOnboardingPageProvider } from './svl_oblt_onboarding_page';
import { SvlObltOnboardingStreamLogFilePageProvider } from './svl_oblt_onboarding_stream_log_file';
import { SvlObltOverviewPageProvider } from './svl_oblt_overview_page';
import { SvlSearchLandingPageProvider } from './svl_search_landing_page';
import { SvlSecLandingPageProvider } from './svl_sec_landing_page';

export const pageObjects = {
  ...xpackFunctionalPageObjects,

  svlCommonPage: SvlCommonPageProvider,
  svlCommonNavigation: SvlCommonNavigationProvider,
  svlObltOnboardingPage: SvlObltOnboardingPageProvider,
  SvlObltOnboardingStreamLogFilePage: SvlObltOnboardingStreamLogFilePageProvider,
  svlObltOverviewPage: SvlObltOverviewPageProvider,
  svlSearchLandingPage: SvlSearchLandingPageProvider,
  svlSecLandingPage: SvlSecLandingPageProvider,
};
