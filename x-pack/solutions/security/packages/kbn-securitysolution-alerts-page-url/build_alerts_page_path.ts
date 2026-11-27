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
const WORKFLOW_TAGS_FIELD = 'kibana.alert.workflow_tags';

/**
 * The longest Alerts page path a link should carry, about 100 alert ids. Kibana refuses a request
 * whose headers, URL included, pass 16 KB, and a proxy in front of it can refuse less, so a longer
 * selection must be referenced by tag.
 */
export const MAX_ALERTS_PAGE_PATH_LENGTH = 8_000;

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
  const byTags = { terms: { [WORKFLOW_TAGS_FIELD]: [...tags] } };
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
const buildSelectionFilter = (selection: AlertsSelection, dataViewId?: string): Filter => ({
  meta: {
    alias: selectionAlias(selection),
    negate: false,
    disabled: false,
    type: 'custom',
    ...(dataViewId ? { index: dataViewId } : {}),
  },
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

const buildPagePath = (filter: Filter, createdAt: string, keepOpenForMs?: number): string =>
  [
    [URL_PARAM_KEY.filters, encode([filter])],
    [URL_PARAM_KEY.timerange, buildPageTimerange(createdAt, keepOpenForMs)],
    [URL_PARAM_KEY.pageFilter, ALL_STATUSES_PAGE_FILTER],
  ]
    .map(([key, value], index) => `${index === 0 ? '?' : '&'}${key}=${encodePageParam(value)}`)
    .join('');

/**
 * The Alerts page path that shows the given alerts and the alerts carrying any of `tags`, in every
 * status. `dataViewId` is the page's data view: without it the filter bar warns that the filter does
 * not apply, and drops it when `courier:ignoreFilterIfFieldNotInIndex` is on.
 */
export const buildAlertsPagePath = (
  alertIds: readonly string[],
  createdAt: string,
  { tags = [], dataViewId }: { tags?: readonly string[]; dataViewId?: string } = {}
): string => buildPagePath(buildSelectionFilter({ alertIds, tags }, dataViewId), createdAt);

/**
 * Same page as `buildAlertsPagePath`, filtered on one alert tag, so the link is the same size for any
 * number of alerts. `keepOpenForMs` keeps the time range open for alerts that get the tag later.
 */
export const buildAlertsPageTagPath = (
  tag: string,
  createdAt: string,
  keepOpenForMs?: number
): string => buildPagePath(buildTagFilter(tag), createdAt, keepOpenForMs);
