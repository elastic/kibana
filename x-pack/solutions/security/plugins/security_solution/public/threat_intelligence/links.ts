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
 * Indicators table (legacy Threat Intelligence entry). Kept as its own
 * deep link so existing role bindings and bookmarks continue to work.
 */
export const indicatorsLinks: LinkItem = {
  ...getSecuritySolutionLink<SecurityPageName>('indicators'),
  globalNavPosition: 10,
  capabilities: [`${SECURITY_FEATURE_ID}.threat-intelligence`],
};

/**
 * Intelligence Hub is the primary Threat Intelligence surface in the
 * solution side nav (lightbulb icon). Correlation Reports stay registered
 * as a deep-link child but are hidden from the side nav because the hub
 * opens correlation in a flyout.
 */
export const intelligenceHubLinks: LinkItem = {
  ...getSecuritySolutionLink<SecurityPageName>('intelligenceHub'),
  // Immediately after Attack Discovery (globalNavPosition: 4) so Hub stays above the fold.
  globalNavPosition: 5,
  sideNavIcon: 'bulb',
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
