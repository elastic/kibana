/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  DEFAULT_ALERTS_INDEX,
  DEFAULT_LOGS_INDEX_PATTERN,
  DISCOVER_LOOKUP_TIME_RANGE,
  SECURITY_ALERT_DETAILS_REDIRECT_PATH,
  THREAT_REPORTS_INDEX_PATTERN,
} from './constants';
export { buildAlertDetailsPath, buildAlertDetailsUrl } from './build_alert_details_url';
export { buildDiscoverEsqlUrl } from './build_discover_esql_url';
export type { DiscoverLookupTimeRange } from './build_discover_esql_url';
export { DiscoverLink } from './discover_link';
export type { DiscoverLinkProps } from './discover_link';
export {
  buildAlertLookupEsql,
  buildEntityLookupEsql,
  buildEventLookupEsql,
  buildIocLookupEsql,
  buildThreatReportLookupEsql,
  buildThreatReportsInEsql,
  escapeEsqlString,
  getAlertsIndex,
} from './esql_queries';
export { ecsFieldForIocType, getIocEsqlFields } from './ioc_field_map';
export type { AttachmentNavigationDeps } from './types';
