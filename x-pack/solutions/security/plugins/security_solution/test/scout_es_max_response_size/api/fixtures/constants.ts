/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_INTERNAL_ORIGIN_HEADER, PUBLIC_API_HEADERS } from '@kbn/scout-security';

export const PUBLIC_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'Content-Type': 'application/json;charset=UTF-8',
  ...ELASTIC_INTERNAL_ORIGIN_HEADER,
  ...PUBLIC_API_HEADERS,
};

/**
 * Must match the `elasticsearch.maxResponseSize` value of the `es_max_response_size` Scout server config set
 * (`@kbn/scout` `src/servers/configs/config_sets/es_max_response_size/shared.ts`).
 */
export const ELASTICSEARCH_MAX_RESPONSE_SIZE_BYTES = 10 * 1024 * 1024;

export const ALERTS_INDEX = '.alerts-security.alerts-default';
