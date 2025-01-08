/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const USER = i18n.translate('xpack.securitySolution.flyout.entityDetails.host.userLabel', {
  defaultMessage: 'User',
});

export const FAIL_MANAGED_USER = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.host.failManagedUserDescription',
  {
    defaultMessage: 'Failed to run search on user managed data',
  }
);

export const RISK_SCORE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.host.riskScoreLabel',
  {
    defaultMessage: 'Risk score',
  }
);

export const CLOSE_BUTTON = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.host.closeButton',
  {
    defaultMessage: 'close',
  }
);
