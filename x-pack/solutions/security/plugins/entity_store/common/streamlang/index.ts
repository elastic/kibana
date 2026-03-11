/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';

export function isNotEmptyCondition(field: string): Condition {
  return {
    and: [
      { field, exists: true },
      { field, neq: '' },
    ],
  };
}

export function isEmptyCondition(field: string): Condition {
  return {
    or: [
      { field, exists: false },
      { field, eq: '' },
    ],
  };
}
