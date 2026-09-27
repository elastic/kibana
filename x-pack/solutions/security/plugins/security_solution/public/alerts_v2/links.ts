/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ALERTS_V2_PATH, SecurityPageName, SECURITY_FEATURE_ID } from '../../common/constants';
import type { LinkItem } from '../common/links/types';

export const alertsV2Links: LinkItem = {
  capabilities: [[`${SECURITY_FEATURE_ID}.show`]],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.alertsV2', {
      defaultMessage: 'Alerts v2',
    }),
  ],
  id: SecurityPageName.alertsV2,
  path: ALERTS_V2_PATH,
  title: i18n.translate('xpack.securitySolution.navLinks.alertsV2.title', {
    defaultMessage: 'Alerts v2',
  }),
};
