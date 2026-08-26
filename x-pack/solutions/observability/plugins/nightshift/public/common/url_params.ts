/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Query param that restores the open event flyout on load or from a shared link. */
export const NIGHTSHIFT_EVENT_ID_QUERY_PARAM = 'eventId';

export const IMPACTED_SERVICES_QUERY_PARAM = 'impactedServices';

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
