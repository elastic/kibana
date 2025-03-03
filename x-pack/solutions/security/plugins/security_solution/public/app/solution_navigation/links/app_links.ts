/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/security-solution-navigation';
import { cloneDeep, remove, find } from 'lodash';
import type { AppLinkItems, LinkItem } from '../../../common/links/types';
import { createInvestigationsLink, createTimelineLink } from './sections/investigations_links';
import { mlAppLink } from './sections/ml_links';
import { createAssetsLinkFromManage } from './sections/assets_links';
import { createSettingsLinksFromManage } from './sections/settings_links';

// This function is called by the security_solution plugin to alter the app links
// that will be registered to the Security Solution application using the new "solution-centric" IA.
// The capabilities filtering is done after this function is called by the security_solution plugin.
// TODO: remove after rollout https://github.com/elastic/kibana/issues/179572
export const solutionAppLinksSwitcher = (appLinks: AppLinkItems): AppLinkItems => {
  const solutionAppLinks = cloneDeep(appLinks) as LinkItem[];

  // Remove manage link
  const [manageLinkItem] = remove(solutionAppLinks, { id: SecurityPageName.administration });

  if (manageLinkItem) {
    solutionAppLinks.push(createAssetsLinkFromManage(manageLinkItem));
    solutionAppLinks.push(...createSettingsLinksFromManage(manageLinkItem));
  }

  // Create investigations link
  const investigationsLinks = [];
  const [timelineLinkItem] = remove(solutionAppLinks, { id: SecurityPageName.timelines });
  if (timelineLinkItem) {
    investigationsLinks.push(createTimelineLink(timelineLinkItem));
  }
  if (manageLinkItem) {
    const noteLinkItem = find(manageLinkItem.links, { id: SecurityPageName.notes });
    if (noteLinkItem) {
      investigationsLinks.push(noteLinkItem);
    }
  }
  if (investigationsLinks.length > 0) {
    solutionAppLinks.push(createInvestigationsLink(investigationsLinks));
  }

  // Add ML link
  solutionAppLinks.push(mlAppLink);

  return Object.freeze(solutionAppLinks);
};
