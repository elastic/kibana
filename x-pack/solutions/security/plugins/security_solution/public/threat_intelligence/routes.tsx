/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, Suspense } from 'react';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { SecurityPageName } from '../app/types';
import type { SecuritySubPluginRoutes } from '../app/types';
import { SecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import { SecuritySolutionTemplateWrapper } from '../app/home/template_wrapper';
import {
  THREAT_INTELLIGENCE_BASE_PATH,
  THREAT_INTELLIGENCE_HUB_PATH,
} from './constants/navigation';
import { ThreatIntelligenceApp } from './plugin';

const LazyIntelligenceHubPage = React.lazy(() =>
  import('./modules/intelligence_hub').then(({ IntelligenceHubPage }) => ({
    default: IntelligenceHubPage,
  }))
);

const ThreatIntelligence = memo(() => {
  return (
    <SecurityRoutePageWrapper pageName={SecurityPageName.threatIntelligence}>
      <ThreatIntelligenceApp />
      <SpyRoute pageName={SecurityPageName.threatIntelligence} />
    </SecurityRoutePageWrapper>
  );
});

ThreatIntelligence.displayName = 'ThreatIntelligence';

const IntelligenceHub = memo(() => {
  return (
    <SecurityRoutePageWrapper pageName={SecurityPageName.threatIntelligenceHub}>
      <SecuritySolutionTemplateWrapper>
        <Suspense fallback={<div />}>
          <LazyIntelligenceHubPage />
        </Suspense>
      </SecuritySolutionTemplateWrapper>
      <SpyRoute pageName={SecurityPageName.threatIntelligenceHub} />
    </SecurityRoutePageWrapper>
  );
});

IntelligenceHub.displayName = 'IntelligenceHub';

/**
 * Route order matters: `/threat_intelligence/hub` must come BEFORE
 * `/threat_intelligence` so React Router does not match the parent path
 * first. The base path catches both `/threat_intelligence` and
 * `/threat_intelligence/indicators` (it is non-strict by design — see
 * `isThreatIntelligencePath` in `../helpers.tsx`).
 */
export const routes: SecuritySubPluginRoutes = [
  {
    path: THREAT_INTELLIGENCE_HUB_PATH,
    component: IntelligenceHub,
  },
  {
    path: THREAT_INTELLIGENCE_BASE_PATH,
    component: ThreatIntelligence,
  },
];
