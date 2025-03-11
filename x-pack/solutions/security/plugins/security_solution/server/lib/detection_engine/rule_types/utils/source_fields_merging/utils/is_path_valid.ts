/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObjectTypeGuard } from './is_objectlike_or_array_of_objectlikes';

/**
 * Returns true if path in SignalSource object is valid
 * Path is valid if each field in hierarchy is object or undefined
 * Path is not valid if ANY of field in hierarchy is not object or undefined
 * The function is robust in that it can handle any mix of dot and nested notation in the document
 * @param key Path (dot-notation) to check for validity
 * @param document Document to search
 * @returns boolean
 */
export const robustIsPathValid = (key: string, document: Record<string, unknown>): boolean => {
  const splitKey = key.split('.');
  let tempKey = splitKey[0];
  for (let i = 0; i < splitKey.length; i++) {
    if (i > 0) {
      tempKey += `.${splitKey[i]}`;
    }
    const value = document[tempKey];
    if (value != null) {
      if (!isObjectTypeGuard(value)) {
        return false;
      } else {
        return robustIsPathValid(splitKey.slice(i + 1).join('.'), value);
      }
    }
  }
  return true;
};
