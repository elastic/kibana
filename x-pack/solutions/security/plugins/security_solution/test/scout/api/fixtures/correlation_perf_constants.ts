/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
  'elastic-api-version': '2023-10-31',
};

export const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';
export const DETECTION_ENGINE_RULES_PREVIEW_URL = '/api/detection_engine/rules/preview';
export const DETECTION_ENGINE_RULES_BULK_ACTION_URL = '/api/detection_engine/rules/_bulk_action';

export const ALERTS_INDEX = '.alerts-security.alerts-default';

export const CORRELATION_PERF_TAGS = [...tags.stateful.classic];
