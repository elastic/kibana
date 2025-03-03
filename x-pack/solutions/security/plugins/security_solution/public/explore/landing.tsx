/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { LandingLinksImages } from '@kbn/security-solution-navigation/landing_links';
import { SecurityPageName } from '../app/types';
import { HeaderPage } from '../common/components/header_page';
import { useRootNavLink } from '../common/links/nav_links';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { trackLandingLinkClick } from '../common/lib/telemetry/trackers';
import { useGlobalQueryString } from '../common/utils/global_query_string';

const EXPLORE_PAGE_TITLE = i18n.translate('xpack.securitySolution.explore.landing.pageTitle', {
  defaultMessage: 'Explore',
});

export const ExploreLandingPage = () => {
  const { links = [] } = useRootNavLink(SecurityPageName.exploreLanding) ?? {};
  const urlState = useGlobalQueryString();

  return (
    <SecuritySolutionPageWrapper>
      <HeaderPage title={EXPLORE_PAGE_TITLE} />
      <LandingLinksImages items={links} urlState={urlState} onLinkClick={trackLandingLinkClick} />
      <SpyRoute pageName={SecurityPageName.exploreLanding} />
    </SecuritySolutionPageWrapper>
  );
};
