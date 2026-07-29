/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Query param that restores the open event flyout on load or from a shared link. */
export const NIGHTSHIFT_EVENT_UUID_QUERY_PARAM = 'eventUuid';

export const buildNightshiftEventFlyoutShareUrl = (eventUuid: string): string => {
  const url = new URL(window.location.href);
  url.searchParams.set(NIGHTSHIFT_EVENT_UUID_QUERY_PARAM, eventUuid);
  return url.toString();
};
