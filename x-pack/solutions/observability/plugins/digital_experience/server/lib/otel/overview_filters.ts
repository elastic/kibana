/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { termQuery } from '@kbn/es-query';
import type { FacetBucket } from '../../../common/sessions';
import { SESSION_ATTRIBUTE_FIELDS } from '../../../common/session_attribute_fields';
import {
  OVERVIEW_FILTER_MAX_LENGTHS,
  OVERVIEW_FILTER_NAMES,
  OVERVIEW_FILTER_SIZE,
  type OverviewFilterName,
  type OverviewFilterOptions,
  type OverviewFilters,
} from '../../../common/overview_filters';
import { EVENT_NAVIGATION_TIMING } from '../../../common/otel_data';
import { SOURCE_URL_FIELD } from '../../sessions/source_fields';
import { environmentFilter } from '../helpers/environment';
import { ENVIRONMENT_FIELDS, eventCount } from './queries';

/**
 * The fields each filter reads, in priority order. The first four are the sessions transform's
 * lists, so a browser, OS, device or country means the same in the Overview and the Sessions.
 */
const FILTER_SOURCE_FIELDS: Record<OverviewFilterName, readonly string[]> = {
  browser: SESSION_ATTRIBUTE_FIELDS.browser,
  os: SESSION_ATTRIBUTE_FIELDS.os,
  device: SESSION_ATTRIBUTE_FIELDS.device,
  country: SESSION_ATTRIBUTE_FIELDS.countryIso,
  pageUrl: [SOURCE_URL_FIELD],
};

/** The runtime field that coalesces the alternatives of a filter. */
const runtimeFieldOf = (name: OverviewFilterName) => `digital_experience_filter_${name}`;

/** The field to filter and aggregate a filter on. */
export const filterFieldOf = (name: OverviewFilterName): string =>
  FILTER_SOURCE_FIELDS[name].length > 1 ? runtimeFieldOf(name) : FILTER_SOURCE_FIELDS[name][0];

/**
 * Takes the first non-empty value of the fields, like the sessions' dest pipeline does, so a
 * document with the same value in both scopes is counted once. Unmapped fields are skipped: the
 * OTel indices map only what their data had.
 */
const COALESCE_SCRIPT = `
  for (def field : params.fields) {
    if (doc.containsKey(field) && doc[field].size() > 0) {
      String value = doc[field].value.toString().trim();
      if (value != '' && value != 'null') {
        emit(value);
        break;
      }
    }
  }
`;

/** The runtime fields of the filters that read more than one field; add them to a search. */
export const filterRuntimeMappings = (): estypes.MappingRuntimeFields =>
  Object.fromEntries(
    OVERVIEW_FILTER_NAMES.filter((name) => FILTER_SOURCE_FIELDS[name].length > 1).map((name) => [
      runtimeFieldOf(name),
      {
        type: 'keyword' as const,
        script: { source: COALESCE_SCRIPT, params: { fields: [...FILTER_SOURCE_FIELDS[name]] } },
      },
    ])
  );

const filterClause = (name: OverviewFilterName, filters: OverviewFilters) =>
  filters[name] ? termQuery(filterFieldOf(name), filters[name]) : [];

/**
 * The selected filters that narrow every document of the Overview, except `exclude`'s own. The page
 * is left out: the web vitals, errors and clicks carry no page URL yet, so it narrows the page
 * loads only (`pageLoadFilters`).
 */
export const documentFilters = (
  filters: OverviewFilters,
  exclude?: OverviewFilterName
): estypes.QueryDslQueryContainer[] =>
  OVERVIEW_FILTER_NAMES.filter((name) => name !== 'pageUrl' && name !== exclude).flatMap((name) =>
    filterClause(name, filters)
  );

/** The selected page, which narrows the page loads (unless it is `exclude`'s own). */
export const pageLoadFilters = (
  filters: OverviewFilters,
  exclude?: OverviewFilterName
): estypes.QueryDslQueryContainer[] =>
  exclude === 'pageUrl' ? [] : filterClause('pageUrl', filters);

const optionsKeyOf = (name: OverviewFilterName) => `${name}Options` as const;

/** The aggregation of one filter: its values with their page loads. */
export interface FilterOptionsAggregation {
  values: { buckets: Array<{ key: string | number; doc_count: number }> };
}

export type FilterOptionsAggregations = Record<
  `${OverviewFilterName}Options`,
  FilterOptionsAggregation
>;

/**
 * Each filter's most used values among the page loads of `environment`, narrowed by the other
 * selected filters.
 */
export const filterOptionsAggs = (
  filters: OverviewFilters,
  environment: string | undefined
): Record<string, estypes.AggregationsAggregationContainer> =>
  Object.fromEntries(
    OVERVIEW_FILTER_NAMES.map((name) => [
      optionsKeyOf(name),
      {
        filter: {
          bool: {
            filter: [
              environmentFilter(ENVIRONMENT_FIELDS, environment),
              eventCount(EVENT_NAVIGATION_TIMING).filter,
              ...documentFilters(filters, name),
              ...pageLoadFilters(filters, name),
            ],
          },
        },
        aggs: { values: { terms: { field: filterFieldOf(name), size: OVERVIEW_FILTER_SIZE } } },
      },
    ])
  );

const toBuckets = (name: OverviewFilterName, aggregation?: FilterOptionsAggregation) =>
  (aggregation?.values.buckets ?? []).flatMap(({ key, doc_count: count }): FacetBucket[] => {
    const value = String(key);
    // Longer values could not be selected: the routes and the URL accept no more.
    return value.length <= OVERVIEW_FILTER_MAX_LENGTHS[name] ? [{ key: value, count }] : [];
  });

/** The values of every filter; empty ones for the empty data of indices that do not exist. */
export const toFilterOptions = (
  aggregations?: Partial<FilterOptionsAggregations>
): OverviewFilterOptions => ({
  browser: toBuckets('browser', aggregations?.browserOptions),
  os: toBuckets('os', aggregations?.osOptions),
  device: toBuckets('device', aggregations?.deviceOptions),
  country: toBuckets('country', aggregations?.countryOptions),
  pageUrl: toBuckets('pageUrl', aggregations?.pageUrlOptions),
});
