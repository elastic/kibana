/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';

export function callDateMath(value: unknown): number {
  const DEFAULT_RETURN_VALUE = 0;
  if (typeof value === 'string') {
    return datemath.parse(value)?.valueOf() ?? DEFAULT_RETURN_VALUE;
  }
  return DEFAULT_RETURN_VALUE;
}
