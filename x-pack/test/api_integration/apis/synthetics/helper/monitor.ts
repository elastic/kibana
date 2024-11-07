/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';

export function omitResponseTimestamps(monitor: object) {
  return omit(monitor, ['created_at', 'updated_at']);
}

export function omitEmptyValues(monitor: object) {
  const { url, ...rest } = omit(monitor, ['created_at', 'updated_at']) as any;

  return {
    ...rest,
    ...(url ? { url } : {}),
  };
}
