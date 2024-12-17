/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';

import { links as attackDiscoveryLinks } from './attack_discovery/links';
import type { AppLinkItems } from './common/links/types';
import { indicatorsLinks } from './threat_intelligence/links';
import { links as alertsLinks } from './detections/links';
import { links as rulesLinks } from './rules/links';
import { links as timelinesLinks } from './timelines/links';
import { links as casesLinks } from './cases/links';
import { links as managementLinks, getManagementFilteredLinks } from './management/links';
import { exploreLinks } from './explore/links';
import { onboardingLinks } from './onboarding/links';
import { findingsLinks } from './cloud_security_posture/links';
import type { StartPlugins } from './types';
import { dashboardsLinks } from './dashboards/links';

// TODO: remove after rollout https://github.com/elastic/kibana/issues/179572
export { solutionAppLinksSwitcher } from './app/solution_navigation/links/app_links';

export const appLinks: AppLinkItems = Object.freeze([
  dashboardsLinks,
  alertsLinks,
  attackDiscoveryLinks,
  findingsLinks,
  casesLinks,
  timelinesLinks,
  indicatorsLinks,
  exploreLinks,
  rulesLinks,
  onboardingLinks,
  managementLinks,
]);

export const getFilteredLinks = async (
  core: CoreStart,
  plugins: StartPlugins
): Promise<AppLinkItems> => {
  const managementFilteredLinks = await getManagementFilteredLinks(core, plugins);

  return Object.freeze([
    dashboardsLinks,
    alertsLinks,
    attackDiscoveryLinks,
    findingsLinks,
    casesLinks,
    timelinesLinks,
    indicatorsLinks,
    exploreLinks,
    rulesLinks,
    onboardingLinks,
    managementFilteredLinks,
  ]);
};
