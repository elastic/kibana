/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LinkItem } from '..';
import { CONFIGURATIONS_PATH, SECURITY_FEATURE_ID, SecurityPageName } from '../../common/constants';
import { CONFIGURATIONS } from '../app/translations';

export const configurationsLinks: LinkItem = {
  capabilities: [[`${SECURITY_FEATURE_ID}.show`, `${SECURITY_FEATURE_ID}.configurations`]],
  globalNavPosition: 3,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.configurations', {
      defaultMessage: 'Configurations',
    }),
  ],
  hideTimeline: true,
  id: SecurityPageName.configurations,
  path: CONFIGURATIONS_PATH,
  title: CONFIGURATIONS,
};
