/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter } from '@kbn/es-query';
import { DISCOVER_LOOKUP_TIME_RANGE, THREAT_REPORTS_INDEX_PATTERN } from './constants';
import type { DiscoverLookupTimeRange } from './build_discover_esql_url';

/** Ad-hoc data view id for threat-report Discover exits that need nested filters. */
export const THREAT_REPORTS_LOOKUP_DATA_VIEW_ID = 'alertzero-threat-reports-lookup' as const;

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
  timeRange = DISCOVER_LOOKUP_TIME_RANGE,
}: {
  share?: SharePluginStart;
  iocType: string;
  value: string;
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
    filters: [nestedFilter],
  } as SerializableRecord);
};
