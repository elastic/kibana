/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_INTERNAL_ORIGIN_HEADER } from '@kbn/scout-security';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'Content-Type': 'application/json;charset=UTF-8',
  ...ELASTIC_INTERNAL_ORIGIN_HEADER,
};
