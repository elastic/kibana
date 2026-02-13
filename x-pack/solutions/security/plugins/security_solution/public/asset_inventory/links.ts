/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { SECURITY_UI_SHOW_PRIVILEGE } from '@kbn/security-solution-features/constants';
import { INVENTORY } from '../app/translations';
import {
  ASSET_INVENTORY_PATH,
  SecurityPageName,
  SECURITY_FEATURE_ID,
  ENABLE_ASSET_INVENTORY_SETTING,
} from '../../common/constants';
import type { LinkItem } from '../common/links/types';

export const links: LinkItem = {
  capabilities: [[SECURITY_UI_SHOW_PRIVILEGE, `${SECURITY_FEATURE_ID}.detections`]],
  globalNavPosition: 12,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.inventory', {
      defaultMessage: 'Inventory',
    }),
  ],
  uiSettingRequired: ENABLE_ASSET_INVENTORY_SETTING,
  id: SecurityPageName.assetInventory,
  path: ASSET_INVENTORY_PATH,
  title: INVENTORY,
};
