/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface NestedBooleanObject {
  [key: string]: boolean | NestedBooleanObject;
}

export const assertDeeplyFalse = (obj: NestedBooleanObject, path: string[] = []) => {
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      assertDeeplyFalse(value, [...path, key]);
    } else if (typeof value === 'boolean') {
      if (value) {
        throw new Error(`${[...path, key].join('.')} is not false: ${value}`);
      }
    } else {
      throw new Error(`Expected nest object with boolean keys. '${key}' is not boolean: ${value}.`);
    }
  });

  return true;
};
