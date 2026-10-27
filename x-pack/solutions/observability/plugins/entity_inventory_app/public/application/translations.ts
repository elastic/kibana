/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EntityInventoryEntityType } from '../types';
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

export const SEARCH_BAR_PLACEHOLDERS: Readonly<Record<EntityInventoryEntityType, string>> = {
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

export const ENTITY_INVENTORY_TITLE = i18n.translate(
  'xpack.entityInventoryApp.entityInventoryTitle',
  { defaultMessage: 'Entity Inventory' }
);

export const ENTITY_PAGE_TITLES: Readonly<Record<EntityInventoryEntityType, string>> = {
  all: i18n.translate('xpack.entityInventoryApp.allResourcesTitle', {
    defaultMessage: 'All resources',
  }),
  hosts: i18n.translate('xpack.entityInventoryApp.hostsTitle', {
    defaultMessage: 'Hosts',
  }),
  kubernetes: i18n.translate('xpack.entityInventoryApp.kubernetesTitle', {
    defaultMessage: 'Kubernetes',
  }),
};

export const TECH_PREVIEW_BADGE_LABEL = i18n.translate(
  'xpack.entityInventoryApp.techPreviewBadgeLabel',
  { defaultMessage: 'Technical preview' }
);

export const TECH_PREVIEW_BADGE_TOOLTIP = i18n.translate(
  'xpack.entityInventoryApp.techPreviewBadgeTooltip',
  {
    defaultMessage:
      'This functionality is in technical preview and may be changed or removed in a future release.',
  }
);
