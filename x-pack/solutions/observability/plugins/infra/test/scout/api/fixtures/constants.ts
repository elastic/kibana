/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
};

export const ES_ARCHIVES = {
  logsAndMetrics:
    'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics',
  hosts7_0_0: 'x-pack/solutions/observability/test/fixtures/es_archives/infra/7.0.0/hosts',
};

/** Time bounds for the hosts 7.0.0 ES archive used by Metrics Explorer API tests. */
export const HOSTS_7_0_0_DATES = {
  min: 1547571261002,
  max: 1547571831033,
};
