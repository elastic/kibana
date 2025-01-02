/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';

export function flattenObject(
  obj: Record<PropertyKey, unknown>,
  parentKey = '',
  result: Record<PropertyKey, unknown> = {}
) {
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      if (isPlainObject(obj[key])) {
        flattenObject(obj[key] as Record<PropertyKey, unknown>, newKey, result);
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  return result;
}
