/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const HORIZONTAL_LINE = '-'.repeat(80);

export const ENDPOINT_EVENTS_INDEX = 'logs-endpoint.events.process-default';

export const ENDPOINT_ALERTS_INDEX = 'logs-endpoint.alerts-default';

export const COMMON_API_HEADERS = Object.freeze({
  'kbn-xsrf': 'security-solution',
  'x-elastic-internal-origin': 'security-solution',
  'elastic-api-version': '2023-10-31',
});
