/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ConfigurationTabs } from './constants';

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
  links: [
    {
      id: SecurityPageName.configurationsIntegrations,
      title: i18n.translate('xpack.securitySolution.appLinks.integrations', {
        defaultMessage: 'Integrations',
      }),
      path: `${CONFIGURATIONS_PATH}/${ConfigurationTabs.integrations}`,
      skipUrlState: true,
      hideTimeline: true,
    },
    {
      id: SecurityPageName.configurationsBasicRules,
      title: i18n.translate('xpack.securitySolution.appLinks.basicRules', {
        defaultMessage: 'Rules',
      }),
      path: `${CONFIGURATIONS_PATH}/${ConfigurationTabs.basicRules}`,
      skipUrlState: true,
      hideTimeline: true,
    },
    {
      id: SecurityPageName.configurationsAiSettings,
      title: i18n.translate('xpack.securitySolution.appLinks.aiSettings', {
        defaultMessage: 'AI settings',
      }),
      path: `${CONFIGURATIONS_PATH}/${ConfigurationTabs.aiSettings}`,
      skipUrlState: true,
      hideTimeline: true,
    },
  ],
};
