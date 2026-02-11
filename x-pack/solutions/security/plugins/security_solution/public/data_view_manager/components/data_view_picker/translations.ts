/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOADING = i18n.translate('xpack.securitySolution.dataViewManager.loading', {
  defaultMessage: 'Loading',
});

export const DEFAULT_SECURITY_DATA_VIEW = i18n.translate(
  'xpack.securitySolution.dataViewManager.defaultSecurityDataView',
  {
    defaultMessage: 'Security solution default',
  }
);

export const DEFAULT_SECURITY_ALERT_DATA_VIEW = i18n.translate(
  'xpack.securitySolution.dataViewManager.defaultSecurityAlertDataView',
  {
    defaultMessage: 'Security solution alerts',
  }
);

export const DEFAULT_SECURITY_ATTACK_DATA_VIEW = i18n.translate(
  'xpack.securitySolution.dataViewManager.defaultSecurityAttackDataView',
  {
    defaultMessage: 'Security solution attacks',
  }
);

export const SECURITY_SOLUTION_EXPLORE_DATA_VIEW = i18n.translate(
  'xpack.securitySolution.dataViewManager.securitySolutionExploreDataView',
  {
    defaultMessage: 'Security solution explore',
  }
);
