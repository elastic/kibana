/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AttackDiscoveryPage } from './pages';
import { AttackDiscoveryMovedPage } from './pages/attack_discovery_moved';

import type { SecuritySubPluginRoutes } from '../app/types';
import { SecurityPageName } from '../app/types';
import { ATTACK_DISCOVERY_PATH } from '../../common/constants';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { SecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import { useIsAlertsAndAttacksAlignmentEnabled } from '../common/hooks/use_is_alerts_and_attacks_alignment_enabled';

export const AttackDiscoveryRoutes = React.memo(() => {
  const enableAlertsAndAttacksAlignment = useIsAlertsAndAttacksAlignmentEnabled();

  return (
    <PluginTemplateWrapper>
      <SecurityRoutePageWrapper pageName={SecurityPageName.attackDiscovery}>
        {enableAlertsAndAttacksAlignment ? <AttackDiscoveryMovedPage /> : <AttackDiscoveryPage />}
      </SecurityRoutePageWrapper>
    </PluginTemplateWrapper>
  );
});
AttackDiscoveryRoutes.displayName = 'AttackDiscoveryRoutes';

export const routes: SecuritySubPluginRoutes = [
  {
    path: ATTACK_DISCOVERY_PATH,
    component: AttackDiscoveryRoutes,
  },
];
