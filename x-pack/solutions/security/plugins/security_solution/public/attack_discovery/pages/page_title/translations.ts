/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ATTACK_DISCOVERY_PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.pageTitle.pageTitle',
  {
    defaultMessage: 'Attack discovery',
  }
);

export const BETA = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.pageTitle.betaBadge',
  {
    defaultMessage: 'Technical preview',
  }
);

export const BETA_TOOLTIP = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.pageTitle.betaTooltip',
  {
    defaultMessage:
      'This functionality is in technical preview and is subject to change. Please use Attack Discovery with caution in production environments.',
  }
);
