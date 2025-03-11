/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { ATTACK_DISCOVERY } from '../app/translations';
import {
  ATTACK_DISCOVERY_FEATURE_ID,
  ATTACK_DISCOVERY_PATH,
  SecurityPageName,
  SECURITY_FEATURE_ID,
} from '../../common/constants';
import type { LinkItem } from '../common/links/types';

export const links: LinkItem = {
  capabilities: [
    [`${SECURITY_FEATURE_ID}.show`, `${ATTACK_DISCOVERY_FEATURE_ID}.attack-discovery`],
  ], // This is an AND condition via the nested array
  globalNavPosition: 4,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.attackDiscovery', {
      defaultMessage: 'Attack discovery',
    }),
  ],
  id: SecurityPageName.attackDiscovery,
  licenseType: 'enterprise',
  path: ATTACK_DISCOVERY_PATH,
  title: ATTACK_DISCOVERY,
};
