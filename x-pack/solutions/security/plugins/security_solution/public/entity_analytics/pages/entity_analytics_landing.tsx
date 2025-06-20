/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { LandingLinksImages } from '@kbn/security-solution-navigation/landing_links';
import { SecurityPageName } from '../../app/types';
import { HeaderPage } from '../../common/components/header_page';
import { useRootNavLink } from '../../common/links/nav_links';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { trackLandingLinkClick } from '../../common/lib/telemetry/trackers';
import { useGlobalQueryString } from '../../common/utils/global_query_string';

const PAGE_TITLE = i18n.translate('xpack.securitySolution.entityAnalytics.landing.pageTitle', {
  defaultMessage: 'Entity analytics',
});

export const EntityAnalyticsLandingPage = () => {
  const entityAnalyticsLandingNavLink = useRootNavLink(SecurityPageName.entityAnalyticsLanding);
  const entityAnalyticsLandinglinks =
    entityAnalyticsLandingNavLink &&
    'links' in entityAnalyticsLandingNavLink &&
    Array.isArray(entityAnalyticsLandingNavLink.links)
      ? entityAnalyticsLandingNavLink.links
      : [];
  const entityAnalyticsOverviewNavLink = useRootNavLink(SecurityPageName.entityAnalyticsOverview);
  const entityAnalyticsOverviewlinks =
    entityAnalyticsOverviewNavLink &&
    'links' in entityAnalyticsOverviewNavLink &&
    Array.isArray(entityAnalyticsOverviewNavLink.links)
      ? entityAnalyticsOverviewNavLink.links
      : [];
  const urlState = useGlobalQueryString();

  return (
    <SecuritySolutionPageWrapper>
      <HeaderPage title={PAGE_TITLE} />
      <LandingLinksImages
        items={entityAnalyticsLandinglinks}
        urlState={urlState}
        onLinkClick={trackLandingLinkClick}
      />
      <SpyRoute pageName={SecurityPageName.entityAnalyticsLanding} />
      <br />
      <br />
      <LandingLinksImages
        items={entityAnalyticsOverviewlinks}
        urlState={urlState}
        onLinkClick={trackLandingLinkClick}
      />
      <SpyRoute pageName={SecurityPageName.entityAnalyticsOverview} />
    </SecuritySolutionPageWrapper>
  );
};
