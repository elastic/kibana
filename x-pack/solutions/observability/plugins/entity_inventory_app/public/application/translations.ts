/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EntityInventoryEntityCategory } from '../types';
import { ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS } from './constants';

export const TIME_RANGE_CLAMPED_TOAST_TITLE = i18n.translate(
  'xpack.entityInventoryApp.searchBar.timeRangeClampedToast',
  {
    defaultMessage: 'Time range limited to the last {maxDays} days of the selected range',
    values: { maxDays: ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS },
  }
);

export const INVALID_QUERY_TOAST_TITLE = i18n.translate(
  'xpack.entityInventoryApp.searchBar.invalidQueryToastTitle',
  { defaultMessage: 'Invalid query' }
);

export const MAX_TIME_RANGE_HINT = i18n.translate(
  'xpack.entityInventoryApp.searchBar.maxTimeRangeHint',
  {
    defaultMessage: 'Max {maxDays} days',
    values: { maxDays: ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS },
  }
);

export const SEARCH_BAR_PLACEHOLDERS: Readonly<Record<EntityInventoryEntityCategory, string>> = {
  all: i18n.translate('xpack.entityInventoryApp.searchBar.placeholder.all', {
    defaultMessage: 'Search resources — e.g. team:platform',
  }),
  hosts: i18n.translate('xpack.entityInventoryApp.searchBar.placeholder.hosts', {
    defaultMessage: 'Search hosts — e.g. host.name:host-1',
  }),
  kubernetes: i18n.translate('xpack.entityInventoryApp.searchBar.placeholder.kubernetes', {
    defaultMessage: 'Search resources — e.g. cluster:prod* AND namespace:payments',
  }),
};

export const ENTITY_LIST_PLACEHOLDER = i18n.translate(
  'xpack.entityInventoryApp.pageShell.entityListPlaceholder',
  { defaultMessage: 'Entity list coming soon' }
);
