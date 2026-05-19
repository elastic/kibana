/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ES_ARCHIVES = {
  FULL_HEARTBEAT:
    'x-pack/solutions/observability/test/fixtures/es_archives/uptime/full_heartbeat',
  BLANK: 'x-pack/solutions/observability/test/fixtures/es_archives/uptime/blank',
} as const;

export const DEFAULT_DATE_RANGE = {
  start: '2019-09-10T12:40:08.078Z',
  end: '2019-09-11T19:40:08.078Z',
} as const;

export const DEFAULT_NAVIGATION_SEARCH =
  'dateRangeEnd=2019-09-11T19:40:08.078Z&dateRangeStart=2019-09-10T12:40:08.078Z';
