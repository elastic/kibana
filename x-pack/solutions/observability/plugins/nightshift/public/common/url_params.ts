/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NIGHTSHIFT_SEARCH_QUERY_PARAM,
  NIGHTSHIFT_SEVERITY_QUERY_PARAM,
  NIGHTSHIFT_INVESTIGATION_ID_QUERY_PARAM,
} from '@kbn/nightshift-investigations-plugin/common';

export {
  NIGHTSHIFT_SEARCH_QUERY_PARAM,
  NIGHTSHIFT_SEVERITY_QUERY_PARAM,
  NIGHTSHIFT_INVESTIGATION_ID_QUERY_PARAM,
};

/** Query param that restores the open event flyout on load or from a shared link. */
export const NIGHTSHIFT_EVENT_ID_QUERY_PARAM = 'eventId';

export const getNightshiftEventIdFromSearch = (search: string): string | undefined =>
  new URLSearchParams(search).get(NIGHTSHIFT_EVENT_ID_QUERY_PARAM) ?? undefined;

export const setNightshiftEventIdParam = (params: URLSearchParams, eventId: string): void => {
  params.set(NIGHTSHIFT_EVENT_ID_QUERY_PARAM, eventId);
};

export const clearNightshiftEventIdParam = (params: URLSearchParams): void => {
  params.delete(NIGHTSHIFT_EVENT_ID_QUERY_PARAM);
};

export const buildNightshiftEventFlyoutShareUrl = (eventId: string): string => {
  const url = new URL(window.location.href);
  url.searchParams.set(NIGHTSHIFT_EVENT_ID_QUERY_PARAM, eventId);
  return url.toString();
};

export const NIGHTSHIFT_RULE_ID_QUERY_PARAM = 'ruleId';

export const getNightshiftRuleIdFromSearch = (search: string): string | undefined =>
  new URLSearchParams(search).get(NIGHTSHIFT_RULE_ID_QUERY_PARAM) ?? undefined;

export const setNightshiftRuleIdParam = (params: URLSearchParams, ruleId: string): void => {
  params.set(NIGHTSHIFT_RULE_ID_QUERY_PARAM, ruleId);
};

export const clearNightshiftRuleIdParam = (params: URLSearchParams): void => {
  params.delete(NIGHTSHIFT_RULE_ID_QUERY_PARAM);
};

export const buildNightshiftRuleFlyoutShareUrl = (ruleId: string): string => {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(NIGHTSHIFT_RULE_ID_QUERY_PARAM, ruleId);
    return url.toString();
  } catch {
    const params = new URLSearchParams(window.location.search);
    params.set(NIGHTSHIFT_RULE_ID_QUERY_PARAM, ruleId);
    return `${window.location.pathname}?${params}`;
  }
};

export const NIGHTSHIFT_SIGNAL_ID_QUERY_PARAM = 'signalId';

export const getNightshiftSignalIdFromSearch = (search: string): string | undefined =>
  new URLSearchParams(search).get(NIGHTSHIFT_SIGNAL_ID_QUERY_PARAM) ?? undefined;

export const setNightshiftSignalIdParam = (params: URLSearchParams, signalId: string): void => {
  params.set(NIGHTSHIFT_SIGNAL_ID_QUERY_PARAM, signalId);
};

export const clearNightshiftSignalIdParam = (params: URLSearchParams): void => {
  params.delete(NIGHTSHIFT_SIGNAL_ID_QUERY_PARAM);
};

export const buildNightshiftSignalFlyoutShareUrl = (signalId: string): string => {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(NIGHTSHIFT_SIGNAL_ID_QUERY_PARAM, signalId);
    return url.toString();
  } catch {
    const params = new URLSearchParams(window.location.search);
    params.set(NIGHTSHIFT_SIGNAL_ID_QUERY_PARAM, signalId);
    return `${window.location.pathname}?${params}`;
  }
};

export const getNightshiftSearchQueryFromSearch = (search: string): string | undefined =>
  new URLSearchParams(search).get(NIGHTSHIFT_SEARCH_QUERY_PARAM) ?? undefined;

export const setNightshiftSearchQueryParam = (params: URLSearchParams, query: string): void => {
  if (query) {
    params.set(NIGHTSHIFT_SEARCH_QUERY_PARAM, query);
  } else {
    params.delete(NIGHTSHIFT_SEARCH_QUERY_PARAM);
  }
};

export const getNightshiftSeverityFromSearch = (search: string): string | undefined =>
  new URLSearchParams(search).get(NIGHTSHIFT_SEVERITY_QUERY_PARAM) ?? undefined;

export const setNightshiftSeverityParam = (params: URLSearchParams, severity: string): void => {
  params.set(NIGHTSHIFT_SEVERITY_QUERY_PARAM, severity);
};
export const getNightshiftInvestigationIdFromSearch = (search: string): string | undefined =>
  new URLSearchParams(search).get(NIGHTSHIFT_INVESTIGATION_ID_QUERY_PARAM) ?? undefined;

export const setNightshiftInvestigationIdParam = (
  params: URLSearchParams,
  investigationId: string
): void => {
  params.set(NIGHTSHIFT_INVESTIGATION_ID_QUERY_PARAM, investigationId);
};

export const clearNightshiftInvestigationIdParam = (params: URLSearchParams): void => {
  params.delete(NIGHTSHIFT_INVESTIGATION_ID_QUERY_PARAM);
};

export const getNightshiftInvestigationPath = (investigationId: string): string =>
  `/?${NIGHTSHIFT_INVESTIGATION_ID_QUERY_PARAM}=${encodeURIComponent(investigationId)}`;

export const buildNightshiftInvestigationFlyoutShareUrl = (investigationId: string): string => {
  const url = new URL(window.location.href);
  url.searchParams.set(NIGHTSHIFT_INVESTIGATION_ID_QUERY_PARAM, investigationId);
  return url.toString();
};
