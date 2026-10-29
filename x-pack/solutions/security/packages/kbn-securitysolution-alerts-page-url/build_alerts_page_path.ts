/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
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

/** The tags analysts and workflows give an alert, as opposed to the rule's tags. */
const ALERT_TAGS_FIELD = 'kibana.alert.workflow_tags';

/**
 * The most alert ids a page link carries. Each id adds about 67 bytes to the URL, and Kibana refuses
 * a request whose headers, URL included, pass 16 KB, so a larger selection must be referenced by tag.
 */
export const MAX_LINKED_ALERT_IDS = 100;

export interface AlertsSelection {
  alertIds?: readonly string[];
  /** Alert tags: the selection also holds every alert that carries one of them. */
  tags?: readonly string[];
}

/** The query matching the alerts of a selection: its ids, or the alerts carrying any of its tags. */
export const buildAlertsSelectionQuery = ({
  alertIds = [],
  tags = [],
}: AlertsSelection): estypes.QueryDslQueryContainer => {
  const byIds = { ids: { values: [...alertIds] } };
  const byTags = { terms: { [ALERT_TAGS_FIELD]: [...tags] } };
  if (tags.length === 0) {
    return byIds;
  }
  if (alertIds.length === 0) {
    return byTags;
  }
  return { bool: { should: [byIds, byTags], minimum_should_match: 1 } };
};

const selectionAlias = ({ alertIds = [], tags = [] }: AlertsSelection): string => {
  if (tags.length === 0) {
    return 'Alert Ids';
  }
  return alertIds.length === 0 ? 'Alert tags' : 'Alert Ids or tags';
};

// One filter, because the page combines separate filters with AND and a selection is ids OR tags.
const buildSelectionFilter = (selection: AlertsSelection): Filter => ({
  meta: { alias: selectionAlias(selection), negate: false, disabled: false, type: 'custom' },
  query: { bool: { filter: buildAlertsSelectionQuery(selection) } },
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

/** The Alerts page path that shows the given alerts and the alerts carrying any of `tags`, in every status. */
export const buildAlertsPagePath = (
  alertIds: readonly string[],
  createdAt: string,
  tags: readonly string[] = []
): string =>
  [
    [URL_PARAM_KEY.filters, encode([buildSelectionFilter({ alertIds, tags })])],
    [URL_PARAM_KEY.timerange, buildPageTimerange(createdAt)],
    [URL_PARAM_KEY.pageFilter, ALL_STATUSES_PAGE_FILTER],
  ]
    .map(([key, value], index) => `${index === 0 ? '?' : '&'}${key}=${encodePageParam(value)}`)
    .join('');
