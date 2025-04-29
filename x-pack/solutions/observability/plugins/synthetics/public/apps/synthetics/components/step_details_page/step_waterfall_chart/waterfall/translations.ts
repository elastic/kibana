/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FILTER_REQUESTS_LABEL = i18n.translate(
  'xpack.synthetics.synthetics.waterfall.searchBox.placeholder',
  {
    defaultMessage: 'Filter network requests',
  }
);

export const SEARCH_REQUESTS_LABEL = i18n.translate(
  'xpack.synthetics.synthetics.waterfall.searchBox.searchLabel',
  {
    defaultMessage: 'Search',
  }
);

export const FILTER_SCREENREADER_LABEL = i18n.translate(
  'xpack.synthetics.synthetics.waterfall.filterGroup.filterScreenreaderLabel',
  {
    defaultMessage: 'Filter by',
  }
);

export const FILTER_REMOVE_SCREENREADER_LABEL = i18n.translate(
  'xpack.synthetics.synthetics.waterfall.filterGroup.removeFilterScreenReaderLabel',
  {
    defaultMessage: 'Remove filter by',
  }
);

export const SIDEBAR_FILTER_MATCHES_SCREENREADER_LABEL = i18n.translate(
  'xpack.synthetics.synthetics.waterfall.sidebar.filterMatchesScreenReaderLabel',
  {
    defaultMessage: 'Resource matches filter',
  }
);
