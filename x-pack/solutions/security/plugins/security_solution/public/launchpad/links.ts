/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ONBOARDING_PATH, SecurityPageName, SECURITY_FEATURE_ID } from '../../common/constants';
import { i18nStrings } from '@kbn/security-solution-navigation/links';
import type { LinkItem } from '../common/links/types';
import { GETTING_STARTED } from '../app/translations';
import { siemReadinessLinks } from '../siem_readiness/links';
import { aiValueLinks } from '../reports/links';

// Get Started child link - uses SecurityPageName.landing (the existing page ID)
const getStartedChildLink: LinkItem = {
  id: SecurityPageName.landing,
  title: GETTING_STARTED,
  path: ONBOARDING_PATH,
  capabilities: [`${SECURITY_FEATURE_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.getStarted', {
      defaultMessage: 'Getting started',
    }),
  ],
  skipUrlState: true,
  hideTimeline: true,
};

export const launchpadLinks: LinkItem = {
  // Launchpad has its own ID (SecurityPageName.launchpad) to avoid conflicts with its child
  // "Get Started" link (SecurityPageName.landing). Both use path: ONBOARDING_PATH to route
  // to the same page (/get_started), but different IDs prevent normalization conflicts and
  // infinite loops in useParentLinks hook.
  id: SecurityPageName.launchpad,
  title: i18nStrings.launchPad.title,
  path: ONBOARDING_PATH,
  skipUrlState: true,
  hideTimeline: true,
  sideNavFooter: true,
  capabilities: [`${SECURITY_FEATURE_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.launchpad', {
      defaultMessage: 'Launchpad',
    }),
  ],
  links: [getStartedChildLink, siemReadinessLinks, aiValueLinks],
};

