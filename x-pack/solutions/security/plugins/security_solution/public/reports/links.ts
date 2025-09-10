/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { StartPlugins } from '../types';
import {
  SecurityPageName,
  SECURITY_FEATURE_ID,
  ATTACK_DISCOVERY_FEATURE_ID,
  AI_VALUE_PATH,
} from '../../common/constants';
import { AI_VALUE_DASHBOARD } from '../app/translations';
import type { LinkItem } from '../common/links/types';

export const aiValueLinks: LinkItem = {
  id: SecurityPageName.aiValue,
  title: AI_VALUE_DASHBOARD,
  description: i18n.translate('xpack.securitySolution.appLinks.aiValueDescription', {
    defaultMessage: 'See ROI for Security AI features',
  }),
  path: AI_VALUE_PATH,
  capabilities: [
    [`${SECURITY_FEATURE_ID}.show`, `${ATTACK_DISCOVERY_FEATURE_ID}.attack-discovery`],
  ],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.aiValue', {
      defaultMessage: 'AI Value',
    }),
  ],
  globalNavPosition: 8,
};

/**
 * Filters the Value report link based on user roles.
 * Only admin and soc_manager roles are allowed to see this link in the complete tier.
 */
export const getAiValueFilteredLinks = async (
  _core: CoreStart,
  plugins: StartPlugins
): Promise<LinkItem | null> => {
  const currentUser = await plugins.security.authc.getCurrentUser();

  if (!currentUser) {
    return null;
  }

  const userRoles = currentUser.roles || [];
  const allowedRoles = ['admin', 'soc_manager', '_search_ai_lake_soc_manager'];

  const hasRequiredRole = allowedRoles.some((role) => userRoles.includes(role));

  return hasRequiredRole ? aiValueLinks : null;
};
