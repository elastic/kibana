/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
};

export const GENERATED_INDEX = 'heartbeat-8-generated-test';

export const ES_ARCHIVES = {
  FULL_HEARTBEAT: 'x-pack/solutions/observability/test/fixtures/es_archives/uptime/full_heartbeat',
  BLANK: 'x-pack/solutions/observability/test/fixtures/es_archives/uptime/blank',
} as const;

export const PINGS_DATE_RANGE_START = String(new Date('2019-09-11T03:31:04.396Z').valueOf());
export const PINGS_DATE_RANGE_END = String(new Date('2020-10-31T00:00:00.889Z').valueOf());

export const API_URLS = {
  PINGS: '/internal/uptime/pings',
  PING_HISTOGRAM: '/internal/uptime/ping/histogram',
  SNAPSHOT_COUNT: '/internal/uptime/snapshot/count',
  MONITOR_LIST: '/internal/uptime/monitor/list',
  MONITOR_STATUS: '/internal/uptime/monitor/status',
  MONITOR_DURATION: '/internal/uptime/monitor/duration',
  INDEX_STATUS: '/internal/uptime/index_status',
  DYNAMIC_SETTINGS: '/api/uptime/settings',
  SYNTHETICS_HAS_INTEGRATION_MONITORS: '/internal/synthetics/fleet/has_integration_monitors',
} as const;
