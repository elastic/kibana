/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, type RouteComponentProps } from 'react-router-dom';
import { useSearchParams } from '@kbn/shared-ux-router';
import {
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';
import { buildAttackDetailPath } from '../../common/utils/attack_detail_path';
import { AttackDiscoveryPage } from './pages';

import type { SecuritySubPluginRoutes } from '../app/types';
import { SecurityPageName } from '../app/types';
import { ATTACKS_PATH, ATTACK_DISCOVERY_PATH } from '../../common/constants';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { SecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import { useSpaceId } from '../common/hooks/use_space_id';
import { useIdsFromUrl } from './pages/results/history/use_ids_from_url';
import { useIsExperimentalFeatureEnabled } from '../common/hooks/use_experimental_features';

export const AttackDiscoveryRoutes = React.memo((props: RouteComponentProps) => {
  const enableAlertsAndAttacksAlignment = useIsExperimentalFeatureEnabled(
    'enableAlertsAndAttacksAlignment'
  );

  const spaceId = useSpaceId();
  const { ids } = useIdsFromUrl();
  const [searchParams] = useSearchParams();

  // When alignment is enabled, the legacy Attack Discovery page is replaced by the Attacks page.
  // Legacy `/attack_discovery?id=<id>` deep links (e.g. the `kibana.alert.url` generated for
  // scheduled/manual Attack Discovery runs) resolve to the Attacks page with the attack flyout
  // open, and any other `/attack_discovery` URL resolves to the main Attacks page.
  if (enableAlertsAndAttacksAlignment) {
    if (ids.length > 0) {
      if (spaceId === undefined) {
        return null; // Wait for spaceId to be resolved before redirecting
      }

      const attackId = ids[0]; // if multiple, open the first one
      const timestamp = searchParams.get('timestamp');
      const index = [
        `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`,
        `${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`,
      ].join(',');

      return <Redirect to={buildAttackDetailPath({ attackId, index, timestamp })} />;
    }

    return <Redirect to={ATTACKS_PATH} />;
  }

  return (
    <PluginTemplateWrapper>
      <SecurityRoutePageWrapper pageName={SecurityPageName.attackDiscovery}>
        <AttackDiscoveryPage />
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
