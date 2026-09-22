/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter } from '@kbn/es-query';
import { SecurityPageName } from '@kbn/deeplinks-security';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { THREAT_REPORTS_INDEX_PATTERN, getAlertsIndex } from './esql_queries';

/** Mirrors Security `APP_PATH` + `ALERT_DETAILS_REDIRECT_PATH` without importing security_solution. */
export const SECURITY_ALERT_DETAILS_REDIRECT_PATH = '/app/security/alerts/redirect' as const;

/**
 * Discover defaults to a short relative window (often last 15m). Attachment exit
 * ramps look up specific docs / IOCs that may be older, so open with a wide range.
 */
export const DISCOVER_LOOKUP_TIME_RANGE = { from: 'now-10y', to: 'now' } as const;

/** Ad-hoc data view id for threat-report Discover exits that need nested filters. */
export const THREAT_REPORTS_LOOKUP_DATA_VIEW_ID = 'alertzero-threat-reports-lookup' as const;

const SECURITY_APP_ID = 'securitySolutionUI';

export interface DiscoverLookupTimeRange {
  from: string;
  to: string;
}

export const buildAlertDetailsPath = ({
  alertId,
  index,
  timestamp,
}: {
  alertId: string;
  index: string;
  timestamp?: string;
}): string => {
  const params = new URLSearchParams({ index });
  if (timestamp) {
    params.set('timestamp', timestamp);
  }
  return `${SECURITY_ALERT_DETAILS_REDIRECT_PATH}/${encodeURIComponent(
    alertId
  )}?${params.toString()}`;
};

export const buildAlertDetailsUrl = ({
  prependPath,
  spaceId,
  alertId,
  index,
  timestamp,
}: {
  prependPath: (path: string) => string;
  spaceId: string;
  alertId: string;
  index?: string;
  timestamp?: string;
}): string => {
  const path = buildAlertDetailsPath({
    alertId,
    index: index ?? getAlertsIndex(spaceId),
    timestamp,
  });
  return prependPath(path);
};

/**
 * Security entity detail page URL for a `host.*` or `user.*` chip. Returns
 * `undefined` for `service.*` fields (no Security entity page exists for
 * services) and when `getUrlForApp` isn't wired (older callers, tests), so
 * the caller can fall back to its Discover ES|QL link.
 */
export const buildSecurityEntityUrl = ({
  getUrlForApp,
  field,
  value,
}: {
  getUrlForApp?: ApplicationStart['getUrlForApp'];
  field: string;
  value: string;
}): string | undefined => {
  if (!getUrlForApp) {
    return undefined;
  }

  const deepLinkId = field.startsWith('host.')
    ? SecurityPageName.hosts
    : field.startsWith('user.')
    ? SecurityPageName.users
    : undefined;

  if (!deepLinkId) {
    return undefined;
  }

  return getUrlForApp(SECURITY_APP_ID, {
    deepLinkId,
    path: `/name/${encodeURIComponent(value)}`,
  });
};

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
