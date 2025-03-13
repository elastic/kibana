/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.securitySolution.alertSummary.landingPage.title', {
  defaultMessage: 'All your alerts in one place with AI',
});

export const SUB_TITLE = i18n.translate(
  'xpack.securitySolution.alertSummary.landingPage.subTitle',
  {
    defaultMessage: 'Bring in your SIEM data to begin surfacing alerts',
  }
);

export const MORE_INTEGRATIONS = i18n.translate(
  'xpack.securitySolution.alertSummary.landingPage.moreIntegrationsButtonLabel',
  {
    defaultMessage: 'More integrations',
  }
);

export const SIEM_BADGE = i18n.translate(
  'xpack.securitySolution.alertSummary.integrations.siemBadge',
  {
    defaultMessage: 'SIEM',
  }
);
