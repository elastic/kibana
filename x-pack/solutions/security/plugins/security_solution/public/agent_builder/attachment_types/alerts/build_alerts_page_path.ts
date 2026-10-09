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
import { buildPageTimerange, encodePageParam } from '../grouped_attachments/page_url';

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

export const buildAlertsPagePath = (alertIds: readonly string[], createdAt: string): string =>
  [
    [URL_PARAM_KEY.filters, encode([buildIdsFilter(alertIds)])],
    [URL_PARAM_KEY.timerange, buildPageTimerange(createdAt)],
    [URL_PARAM_KEY.pageFilter, ALL_STATUSES_PAGE_FILTER],
  ]
    .map(([key, value], index) => `${index === 0 ? '?' : '&'}${key}=${encodePageParam(value)}`)
    .join('');
