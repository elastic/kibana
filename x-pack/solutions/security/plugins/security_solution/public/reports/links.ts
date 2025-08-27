/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SecurityPageName, SECURITY_FEATURE_ID, AI_VALUE_PATH } from '../../common/constants';
import { AI_VALUE_DASHBOARD } from '../app/translations';
import type { LinkItem } from '../common/links/types';

export const aiValueLinks: LinkItem = {
  id: SecurityPageName.aiValue,
  title: AI_VALUE_DASHBOARD,
  description: i18n.translate('xpack.securitySolution.appLinks.aiValueDescription', {
    defaultMessage: 'See ROI for Security AI features',
  }),
  path: AI_VALUE_PATH,
  capabilities: [[`${SECURITY_FEATURE_ID}.show`, `${SECURITY_FEATURE_ID}.external_detections`]],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.aiValue', {
      defaultMessage: 'AI Value',
    }),
  ],
  globalNavPosition: 8,
};
