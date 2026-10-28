/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { FilterStateStore } from '@kbn/es-query';
import type { Filter } from '@kbn/es-query';
import { formatPageFilterSearchParam } from './format_page_filter_search_param';
import { buildPageTimerange, encodePageParam } from './page_url';

/** The Security app's URL parameter names, as `URL_PARAM_KEY` in the security_solution plugin spells them. */
const URL_PARAM_KEY = {
  filters: 'filters',
  timerange: 'timerange',
  pageFilter: 'pageFilters',
} as const;

const buildIdsFilter = (ids: readonly string[]): Filter => ({
  meta: { alias: 'Alert Ids', negate: false, disabled: false, type: 'custom' },
  query: { bool: { filter: { ids: { values: [...ids] } } } },
  $state: { store: FilterStateStore.APP_STATE },
});

const ALL_STATUSES_PAGE_FILTER = encode(
  formatPageFilterSearchParam([
    {
      field_name: 'kibana.alert.workflow_status',
      title: 'Status',
      selected_options: ['open', 'acknowledged', 'in-progress', 'closed'],
    },
  ])
);

const WORKFLOW_TAGS_FIELD = 'kibana.alert.workflow_tags';

const buildTagFilter = (tag: string): Filter => ({
  meta: {
    alias: null,
    disabled: false,
    negate: false,
    type: 'phrase',
    key: WORKFLOW_TAGS_FIELD,
    params: { query: tag },
  },
  query: { match_phrase: { [WORKFLOW_TAGS_FIELD]: tag } },
  $state: { store: FilterStateStore.APP_STATE },
});

const buildPagePath = (filter: Filter, createdAt: string): string =>
  [
    [URL_PARAM_KEY.filters, encode([filter])],
    [URL_PARAM_KEY.timerange, buildPageTimerange(createdAt)],
    [URL_PARAM_KEY.pageFilter, ALL_STATUSES_PAGE_FILTER],
  ]
    .map(([key, value], index) => `${index === 0 ? '?' : '&'}${key}=${encodePageParam(value)}`)
    .join('');

export const buildAlertsPagePath = (alertIds: readonly string[], createdAt: string): string =>
  buildPagePath(buildIdsFilter(alertIds), createdAt);

/** Same page as `buildAlertsPagePath`, filtered on one alert tag, so the link is the same size for any number of alerts. */
export const buildAlertsPageTagPath = (tag: string, createdAt: string): string =>
  buildPagePath(buildTagFilter(tag), createdAt);
