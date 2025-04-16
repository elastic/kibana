/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/security-solution-navigation';
import type { AppDeepLinkId, NodeDefinition } from '@kbn/core-chrome-browser';
import { ALERT_SUMMARY, CONFIGURATIONS } from './translations';

export const alertSummaryLink: NodeDefinition<AppDeepLinkId, string, string> = {
  id: SecurityPageName.alertSummary,
  link: 'securitySolutionUI:alert_summary',
  title: ALERT_SUMMARY,
};

export const configurationsLink: NodeDefinition<AppDeepLinkId, string, string> = {
  id: SecurityPageName.configurations,
  link: 'securitySolutionUI:configurations',
  title: CONFIGURATIONS,
  renderAs: 'panelOpener',
  children: [
    {
      link: `securitySolutionUI:configurations-integrations`,
    },
    {
      link: `securitySolutionUI:configurations-basic_rules`,
    },
    {
      link: `securitySolutionUI:configurations-ai_settings`,
    },
  ],
};
