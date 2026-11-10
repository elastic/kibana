/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CATEGORY_FILTER_LABEL = i18n.translate(
  'xpack.entityInventoryApp.filters.categoryFilterLabel',
  { defaultMessage: 'Category' }
);

export const TYPE_FILTER_LABEL = i18n.translate(
  'xpack.entityInventoryApp.filters.typeFilterLabel',
  {
    defaultMessage: 'Type',
  }
);

export const ALL_CATEGORIES_LABEL = i18n.translate(
  'xpack.entityInventoryApp.filters.allCategoriesLabel',
  { defaultMessage: 'All categories' }
);

export const ALL_TYPES_LABEL = i18n.translate('xpack.entityInventoryApp.filters.allTypesLabel', {
  defaultMessage: 'All types',
});

export const CLEAR_FILTERS_LABEL = i18n.translate(
  'xpack.entityInventoryApp.filters.clearFiltersLabel',
  { defaultMessage: 'Clear filters' }
);

export const INVALID_OPTION_TOOLTIP = i18n.translate(
  'xpack.entityInventoryApp.filters.invalidOptionTooltip',
  {
    defaultMessage:
      'No entities match this value with the current filters. It is removed from the list when you unselect it.',
  }
);

export const VALUES_ERROR_MESSAGE = i18n.translate(
  'xpack.entityInventoryApp.filters.valuesErrorMessage',
  { defaultMessage: 'The values could not be loaded' }
);

export const TYPES_ERROR_MESSAGE = i18n.translate(
  'xpack.entityInventoryApp.filters.typesErrorMessage',
  { defaultMessage: 'The filters could not be loaded' }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.entityInventoryApp.filters.searchPlaceholder',
  {
    defaultMessage: 'Search',
  }
);

export const EMPTY_MESSAGE = i18n.translate('xpack.entityInventoryApp.filters.emptyMessage', {
  defaultMessage: 'No options available',
});
