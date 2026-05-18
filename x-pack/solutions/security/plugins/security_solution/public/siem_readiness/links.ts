/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { SIEM_READINESS } from '../app/translations';
import { SIEM_READINESS_PATH, SecurityPageName, SECURITY_FEATURE_ID } from '../../common/constants';
import type { LinkItem } from '../common/links/types';

export const siemReadinessLinks: LinkItem = {
  capabilities: [[`${SECURITY_FEATURE_ID}.show`]],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.siem_readiness', {
      defaultMessage: 'SIEM Readiness',
    }),
  ],
  hideTimeline: true,
  isBeta: true,
  id: SecurityPageName.siemReadiness,
  path: SIEM_READINESS_PATH,
  title: SIEM_READINESS,
};
