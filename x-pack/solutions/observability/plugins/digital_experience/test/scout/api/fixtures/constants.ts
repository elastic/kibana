/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIME_RANGE } from '../../common/fixtures/constants';

export * from '../../common/fixtures/constants';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
} as const;

export const APPLICATIONS_PATH = 'internal/digital_experience/applications';

/**
 * A route of one application's tab in `TIME_RANGE`, e.g. `usage`, optionally of one
 * environment.
 */
export const applicationTabPath = (
  serviceName: string,
  tabPath: 'usage' | 'errors' | 'network',
  environment?: string
): string => {
  const query = new URLSearchParams({
    start: TIME_RANGE.rangeFrom,
    end: TIME_RANGE.rangeTo,
    ...(environment ? { environment } : {}),
  });
  return `${APPLICATIONS_PATH}/${encodeURIComponent(serviceName)}/${tabPath}?${query}`;
};

export const APPLICATIONS_IN_TIME_RANGE_PATH = `${APPLICATIONS_PATH}?start=${TIME_RANGE.rangeFrom}&end=${TIME_RANGE.rangeTo}`;

export const SESSIONS_ENABLE_PATH = 'internal/digital_experience/sessions/enable';

export const NEW_YORK_TIME_ZONE = 'America/New_York';

/** 30 days, which get 12-hour buckets; New York is UTC-5 in January. */
export const THIRTY_DAYS = { start: '2021-01-01T05:00:00.000Z', end: '2021-01-31T05:00:00.000Z' };

/** About 3 months, which get daily buckets, across the 2021-03-14 New York daylight saving change. */
export const ACROSS_DAYLIGHT_SAVING = {
  start: '2021-02-01T05:00:00.000Z',
  end: '2021-05-01T04:00:00.000Z',
};

/** The path of a route over a range, with its query. */
export const withQuery = (
  path: string,
  { start, end, timeZone }: { start: string; end: string; timeZone?: string }
) => `${path}?start=${start}&end=${end}${timeZone ? `&timeZone=${timeZone}` : ''}`;

/** The Overview route of `OTEL_APPS.shop`. */
export const OVERVIEW_PATH = `${APPLICATIONS_PATH}/otel-shop/overview`;
