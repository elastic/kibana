/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import { firstValueFrom } from 'rxjs';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';

import { ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING } from '../../../common/constants';
import { aiValueLinks } from '../../reports/links';
import { configurationsLinks, getConfigurationsLinks } from '../../configurations/links';
import { links as attackDiscoveryLinks } from '../../attack_discovery/links';
import { links as assetInventoryLinks } from '../../asset_inventory/links';
import { siemReadinessLinks } from '../../siem_readiness/links';
import type { AppLinkItems } from '../../common/links/types';
import { indicatorsLinks } from '../../threat_intelligence/links';
import { alertDetectionsLinks, alertSummaryLink, alertsLink } from '../../detections/links';
import { links as rulesLinks } from '../../rules/links';
import { links as siemMigrationsLinks } from '../../siem_migrations/links';
import { links as timelinesLinks } from '../../timelines/links';
import { links as casesLinks } from '../../cases/links';
import { links as managementLinks, getManagementFilteredLinks } from '../../management/links';
import { exploreLinks } from '../../explore/links';
import { onboardingLinks } from '../../onboarding/links';
import { findingsLinks } from '../../cloud_security_posture/links';
import type { StartPlugins } from '../../types';
import { dashboardsLinks } from '../../dashboards/links';
import { entityAnalyticsLinks } from '../../entity_analytics/links';

export const appLinks: AppLinkItems = Object.freeze([
  dashboardsLinks,
  alertsLink,
  alertSummaryLink,
  attackDiscoveryLinks,
  findingsLinks,
  casesLinks,
  configurationsLinks,
  timelinesLinks,
  indicatorsLinks,
  exploreLinks,
  entityAnalyticsLinks,
  assetInventoryLinks,
  rulesLinks,
  siemMigrationsLinks,
  onboardingLinks,
  managementLinks,
  siemReadinessLinks,
  aiValueLinks,
]);

export const getFilteredLinks = async (
  core: CoreStart,
  plugins: StartPlugins
): Promise<AppLinkItems> => {
  const managementFilteredLinks = await getManagementFilteredLinks(core, plugins);

  const chatExperience$ = core.uiSettings.get$<AIChatExperience>(
    AI_CHAT_EXPERIENCE_TYPE,
    AIChatExperience.Classic
  );
  const chatExperience: AIChatExperience = await firstValueFrom(chatExperience$);
  const filteredConfigurationsLinks = getConfigurationsLinks(chatExperience);

  return Object.freeze([
    dashboardsLinks,
    core.uiSettings.get(ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING, false)
      ? alertDetectionsLinks
      : alertsLink,
    alertSummaryLink,
    attackDiscoveryLinks,
    findingsLinks,
    casesLinks,
    filteredConfigurationsLinks,
    timelinesLinks,
    indicatorsLinks,
    exploreLinks,
    entityAnalyticsLinks,
    assetInventoryLinks,
    rulesLinks,
    siemMigrationsLinks,
    onboardingLinks,
    managementFilteredLinks,
    siemReadinessLinks,
    aiValueLinks,
  ]);
};
