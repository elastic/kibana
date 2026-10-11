/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { FilterStateStore } from '@kbn/es-query';
import type { Filter } from '@kbn/es-query';
import { formatPageFilterSearchParam } from '../../../../common/utils/format_page_filter_search_param';
import { URL_PARAM_KEY } from '../../../common/hooks/constants';

const WINDOW_BEFORE_CREATION_MS = 28 * 24 * 60 * 60 * 1000;
const WINDOW_AFTER_NOW_MS = 60 * 60 * 1000;

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

const buildTimerange = (createdAt: string): string => {
  const from = new Date(new Date(createdAt).getTime() - WINDOW_BEFORE_CREATION_MS).toISOString();
  const to = new Date(Date.now() + WINDOW_AFTER_NOW_MS).toISOString();
  return encode({
    global: { linkTo: [], timerange: { from, kind: 'absolute', to } },
    timeline: { linkTo: [], timerange: { from, kind: 'absolute', to } },
  });
};

// `,` and `:` are the bulk of a rison array of ids and are legal in a query string value.
const encodeParam = (value: string): string =>
  encodeURIComponent(value).replace(/%2C/g, ',').replace(/%3A/g, ':');

export const buildAlertsPagePath = (alertIds: readonly string[], createdAt: string): string =>
  [
    [URL_PARAM_KEY.filters, encode([buildIdsFilter(alertIds)])],
    [URL_PARAM_KEY.timerange, buildTimerange(createdAt)],
    [URL_PARAM_KEY.pageFilter, ALL_STATUSES_PAGE_FILTER],
  ]
    .map(([key, value], index) => `${index === 0 ? '?' : '&'}${key}=${encodeParam(value)}`)
    .join('');
