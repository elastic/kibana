/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter } from '@kbn/es-query';
import { THREAT_REPORTS_INDEX_PATTERN, GLOBAL_THREAT_INTEL_SPACE_ID } from './esql_queries';

/**
 * Discover defaults to a short relative window (often last 15m). Attachment exit
 * ramps look up specific docs / IOCs that may be older, so open with a wide range.
 */
export const DISCOVER_LOOKUP_TIME_RANGE = { from: 'now-10y', to: 'now' } as const;

/** Ad-hoc data view id for threat-report Discover exits that need nested filters. */
export const THREAT_REPORTS_LOOKUP_DATA_VIEW_ID = 'alertzero-threat-reports-lookup' as const;

export interface DiscoverLookupTimeRange {
  from: string;
  to: string;
}

export const buildDiscoverEsqlUrl = ({
  share,
  esql,
  timeRange = DISCOVER_LOOKUP_TIME_RANGE,
}: {
  share?: SharePluginStart;
  esql: string;
  /** Defaults to a wide window so historic reports / events are not filtered out. */
  timeRange?: DiscoverLookupTimeRange;
}): string | undefined => {
  if (!share || !esql) {
    return undefined;
  }

  const locator = share.url.locators.get('DISCOVER_APP_LOCATOR');
  // Locator params are typed as SerializableRecord; from/to time ranges are plain strings.
  return locator?.getRedirectUrl({
    query: { esql },
    timeRange: {
      from: timeRange.from,
      to: timeRange.to,
    },
  } as SerializableRecord);
};

/**
 * Build a Discover URL that finds threat reports containing a nested IOC value.
 *
 * Hash correlation anchors live on `extracted.iocs` (nested). ES|QL cannot filter
 * nested fields, so this opens classic Discover with a nested term filter instead
 * of an ES|QL `logs-*` / `file.hash.*` lookup (those fields never hold report-only
 * correlation hashes).
 */
export const buildDiscoverThreatReportNestedIocUrl = ({
  share,
  iocType,
  value,
  spaceId,
  timeRange = DISCOVER_LOOKUP_TIME_RANGE,
}: {
  share?: SharePluginStart;
  iocType: string;
  value: string;
  /** Active space id; the report rows are space-scoped by `space_id`. */
  spaceId: string;
  timeRange?: DiscoverLookupTimeRange;
}): string | undefined => {
  if (!share || !iocType.trim() || !value.trim()) {
    return undefined;
  }

  const locator = share.url.locators.get('DISCOVER_APP_LOCATOR');
  if (!locator) {
    return undefined;
  }

  const nestedFilter: Filter = {
    meta: {
      index: THREAT_REPORTS_LOOKUP_DATA_VIEW_ID,
      type: 'custom',
      disabled: false,
      negate: false,
      alias: null,
      key: 'extracted.iocs',
      value: `${iocType}:${value}`,
    },
    query: {
      nested: {
        path: 'extracted.iocs',
        query: {
          bool: {
            filter: [
              { term: { 'extracted.iocs.type': iocType } },
              { term: { 'extracted.iocs.value': value } },
            ],
          },
        },
      },
    },
  };

  // Threat reports are logically space-scoped, same as the ES|QL exits in
  // `esql_queries.ts`. This filter opens the shared hidden index directly, so it
  // must apply the same `space_id IN (currentSpace, '*')` scoping or a user could
  // read another space's report by following this link.
  const spaceFilter: Filter = {
    meta: {
      index: THREAT_REPORTS_LOOKUP_DATA_VIEW_ID,
      type: 'phrases',
      key: 'space_id',
      disabled: false,
      negate: false,
      alias: null,
    },
    query: {
      bool: {
        minimum_should_match: 1,
        should: [
          { match_phrase: { space_id: spaceId } },
          { match_phrase: { space_id: GLOBAL_THREAT_INTEL_SPACE_ID } },
        ],
      },
    },
  };

  return locator.getRedirectUrl({
    dataViewSpec: {
      id: THREAT_REPORTS_LOOKUP_DATA_VIEW_ID,
      title: THREAT_REPORTS_INDEX_PATTERN,
      timeFieldName: '@timestamp',
      allowNoIndex: true,
      allowHidden: true,
    },
    timeRange: {
      from: timeRange.from,
      to: timeRange.to,
    },
    query: { language: 'kuery', query: '' },
    filters: [nestedFilter, spaceFilter],
  } as SerializableRecord);
};
