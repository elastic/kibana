/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Query param that restores the open event flyout on load or from a shared link. */
export const NIGHTSHIFT_EVENT_UUID_QUERY_PARAM = 'eventUuid';

export const NIGHTSHIFT_EVENT_ID_QUERY_PARAM = 'eventId';

export const BLAST_RADIUS_QUERY_PARAM = 'blastRadius';

export const getNightshiftEventSelectionFromSearch = (
  search: string
): { eventId?: string; eventUuid?: string } => {
  const params = new URLSearchParams(search);
  return {
    eventId: params.get(NIGHTSHIFT_EVENT_ID_QUERY_PARAM) ?? undefined,
    eventUuid: params.get(NIGHTSHIFT_EVENT_UUID_QUERY_PARAM) ?? undefined,
  };
};

export const setNightshiftEventSelectionParams = (
  params: URLSearchParams,
  selection: { eventId: string; eventUuid: string }
): void => {
  params.set(NIGHTSHIFT_EVENT_UUID_QUERY_PARAM, selection.eventUuid);
  params.set(NIGHTSHIFT_EVENT_ID_QUERY_PARAM, selection.eventId);
};

export const clearNightshiftEventSelectionParams = (params: URLSearchParams): void => {
  params.delete(NIGHTSHIFT_EVENT_UUID_QUERY_PARAM);
  params.delete(NIGHTSHIFT_EVENT_ID_QUERY_PARAM);
};

export const buildNightshiftEventFlyoutShareUrl = (eventUuid: string, eventId?: string): string => {
  const url = new URL(window.location.href);
  url.searchParams.set(NIGHTSHIFT_EVENT_UUID_QUERY_PARAM, eventUuid);
  if (eventId) {
    url.searchParams.set(NIGHTSHIFT_EVENT_ID_QUERY_PARAM, eventId);
  } else {
    url.searchParams.delete(NIGHTSHIFT_EVENT_ID_QUERY_PARAM);
  }
  return url.toString();
};
