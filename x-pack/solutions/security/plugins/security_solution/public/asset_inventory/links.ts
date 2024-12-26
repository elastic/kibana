/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { INVENTORY } from '../app/translations';
import { ASSET_INVENTORY_PATH, SecurityPageName, SERVER_APP_ID } from '../../common/constants';
import type { LinkItem } from '../common/links/types';

export const links: LinkItem = {
  capabilities: [`${SERVER_APP_ID}.show`],
  globalNavPosition: 10,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.inventory', {
      defaultMessage: 'Inventory',
    }),
  ],
  experimentalKey: 'assetInventoryStoreEnabled',
  id: SecurityPageName.assetInventory,
  path: ASSET_INVENTORY_PATH,
  title: INVENTORY,
};
