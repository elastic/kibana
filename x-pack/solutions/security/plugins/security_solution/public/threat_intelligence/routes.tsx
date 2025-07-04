/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { SecurityPageName } from '../app/types';
import type { SecuritySubPluginRoutes } from '../app/types';
import { SecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import { THREAT_INTELLIGENCE_BASE_PATH } from './constants/navigation';
import { ThreatIntelligenceApp } from './plugin';

const ThreatIntelligence = memo(() => {
  return (
    <SecurityRoutePageWrapper pageName={SecurityPageName.threatIntelligence}>
      <ThreatIntelligenceApp />
      <SpyRoute pageName={SecurityPageName.threatIntelligence} />
    </SecurityRoutePageWrapper>
  );
});

ThreatIntelligence.displayName = 'ThreatIntelligence';

export const routes: SecuritySubPluginRoutes = [
  {
    path: THREAT_INTELLIGENCE_BASE_PATH,
    component: ThreatIntelligence,
  },
];
