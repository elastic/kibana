/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { unset } from 'lodash';

import type { SearchTypes } from '../../../../../../../common/detection_engine/types';
import { isObjectTypeGuard } from './is_objectlike_or_array_of_objectlikes';

/**
 * Similar to lodash `get`, but instead of handling only pure dot or nested notation this function handles any mix of dot and nested notation
 *
 * Note: this function makes no attempt to handle arrays in the middle of the path because it's only used to fetch values based on paths from
 * the `fields` option on search requests, which can never have arrays in the middle of the path
 * @param key Path to field, in dot notation
 * @param document Object to fetch value from
 * @returns Fetched value or undefined
 */
export const robustGet = ({
  key,
  document,
}: {
  key: string;
  document: Record<string, unknown>;
}): SearchTypes => {
  const fastPathValue = document[key];
  if (fastPathValue != null) {
    return fastPathValue;
  }
  const splitKey = key.split('.');
  let tempKey = splitKey[0];
  for (let i = 0; i < splitKey.length - 1; i++) {
    if (i > 0) {
      tempKey += `.${splitKey[i]}`;
    }
    const value = document[tempKey];
    if (value != null) {
      if (isObjectTypeGuard(value)) {
        return robustGet({ key: splitKey.slice(i + 1).join('.'), document: value });
      } else {
        return undefined;
      }
    }
  }
  return undefined;
};

/**
 * Similar to lodash set, but instead of handling only pure dot or nested notation this function handles any mix of dot and nested notation
 * @param key Path to field, in dot notation
 * @param valueToSet Value to insert into document
 * @param document Object to insert value into
 * @returns Updated document
 */
export const robustSet = <T extends Record<string, unknown>>({
  key,
  valueToSet,
  document,
}: {
  key: string;
  valueToSet: SearchTypes;
  document: T;
}) => {
  const splitKey = key.split('.');
  let tempKey = splitKey[0];
  for (let i = 0; i < splitKey.length - 1; i++) {
    if (i > 0) {
      tempKey += `.${splitKey[i]}`;
    }
    const value = document[tempKey];
    if (value != null) {
      if (isObjectTypeGuard(value)) {
        robustSet({ key: splitKey.slice(i + 1).join('.'), valueToSet, document: value });
        return document;
      }
    }
  }
  return set(document, key, valueToSet);
};

/**
 * Similar to lodash unset, but instead of handling only pure dot or nested notation this function handles any mix of dot and nested notation
 * @param key Path to field, in dot notation
 * @param document Object to insert value into
 * @returns updated document
 */
export const robustUnset = <T extends Record<string, unknown>>({
  key,
  document,
}: {
  key: string;
  document: T;
}) => {
  const splitKey = key.split('.');
  let tempKey = splitKey[0];
  for (let i = 0; i < splitKey.length - 1; i++) {
    if (i > 0) {
      tempKey += `.${splitKey[i]}`;
    }
    const value = document[tempKey];
    if (value != null) {
      if (isObjectTypeGuard(value)) {
        if (Object.keys(value).length !== 0) {
          robustUnset({ key: splitKey.slice(i + 1).join('.'), document: value });
          // check if field was removed from object, if so, we remove empty parent too
          if (Object.keys(value).length === 0) {
            unset(document, tempKey);
          }
        }

        return document;
      }
    }
  }
  unset(document, key);
  return document;
};
