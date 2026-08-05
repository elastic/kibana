/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, type RouteComponentProps } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom-v5-compat';
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
import { useIsAlertsAndAttacksAlignmentEnabled } from '../common/hooks/use_is_alerts_and_attacks_alignment_enabled';

/**
 * The legacy `/attack_discovery` → Attacks redirect (introduced when the Attacks page went
 * GA) is intentionally retained but disabled. Attack Discovery is now a permanent top-level
 * page that stays visible regardless of the alerts-and-attacks alignment setting, so the
 * redirect must not fire. We keep the logic behind this flag rather than deleting it so it
 * can be quickly restored if we later decide to fully retire the Attack Discovery page.
 */
const ENABLE_LEGACY_ATTACK_DISCOVERY_REDIRECT = false;

export const AttackDiscoveryRoutes = React.memo((props: RouteComponentProps) => {
  const enableAlertsAndAttacksAlignment = useIsAlertsAndAttacksAlignmentEnabled();

  const spaceId = useSpaceId();
  const { ids } = useIdsFromUrl();
  const [searchParams] = useSearchParams();

  if (ENABLE_LEGACY_ATTACK_DISCOVERY_REDIRECT && enableAlertsAndAttacksAlignment) {
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
