/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPageName } from '../../common/constants';
import { SECURITY_FEATURE_ID } from '../../common/constants';
import type { LinkItem } from '../common/links';
import { getSecuritySolutionLink } from './utils/security_solution_links';

/**
 * Intelligence Hub deep link. Nested under classic-nav "Intelligence"
 * (`indicatorsLinks`) so it appears as a sub-item without an icon.
 *
 * Solution nav still surfaces Hub as a top-level item with a lightbulb via
 * `navigation_tree.ts` (ESS / serverless), which hard-codes `icon: 'bulb'`.
 * Correlation Reports stay registered as a deep-link child but are hidden
 * from the side nav because the hub opens correlation in a flyout.
 */
export const intelligenceHubLinks: LinkItem = {
  ...getSecuritySolutionLink<SecurityPageName>('intelligenceHub'),
  hideTimeline: true,
  capabilities: [`${SECURITY_FEATURE_ID}.threat-intelligence`],
  links: [
    {
      ...getSecuritySolutionLink<SecurityPageName>('correlationReport'),
      capabilities: [`${SECURITY_FEATURE_ID}.threat-intelligence`],
      sideNavDisabled: true,
      hideTimeline: true,
    },
  ],
};

/**
 * Classic-nav "Intelligence" entry (indicators table). Hub is a child so the
 * classic Security side nav shows `Intelligence > Intelligence Hub`.
 *
 * The top-level page id stays `SecurityPageName.threatIntelligence` so existing
 * role bindings keyed on `${SECURITY_FEATURE_ID}.threat-intelligence` continue
 * to gate the area without migration.
 */
export const indicatorsLinks: LinkItem = {
  ...getSecuritySolutionLink<SecurityPageName>('indicators'),
  globalNavPosition: 10,
  capabilities: [`${SECURITY_FEATURE_ID}.threat-intelligence`],
  links: [intelligenceHubLinks],
};
