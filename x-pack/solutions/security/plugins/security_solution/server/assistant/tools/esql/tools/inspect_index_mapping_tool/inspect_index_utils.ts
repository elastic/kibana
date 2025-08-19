/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

/**
 * Gets the entries at a given key in an index mapping
 */
export const getNestedValue = (obj: unknown, keyPath: string) => {
  const normalizedKeyPath = keyPath.trim() === '.' ? '' : keyPath.trim();
  return normalizedKeyPath ? get(obj, normalizedKeyPath) : obj;
};

/**
 * Returns a shallow view of the object
 * @param obj The object
 * @param maxDepth The maximum depth to recurse into the object
 * @returns A shallow view of the mapping
 */
export const shallowObjectView = (obj: unknown, maxDepth = 1): object | string | undefined => {
  if (
    obj === undefined ||
    typeof obj === 'string' ||
    typeof obj === 'number' ||
    typeof obj === 'boolean'
  ) {
    return obj?.toString() ?? undefined;
  }

  if (Array.isArray(obj)) {
    return maxDepth <= 0 ? '...' : obj;
  }

  if (typeof obj === 'object' && obj !== null) {
    if (maxDepth <= 0) {
      return '...';
    }
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        typeof value === 'object'
          ? shallowObjectView(value, maxDepth - 1)
          : value?.toString() ?? undefined,
      ])
    );
  }

  return 'unknown';
};

/**
 * Same as shallowObjectView but reduces the maxDepth if the stringified view is longer than maxCharacters
 * @param mapping The index mapping
 * @param maxCharacters The maximum number of characters to return
 * @param maxDepth The maximum depth to recurse into the object
 * @returns A shallow view of the mapping
 */

export const shallowObjectViewTruncated = (
  obj: unknown,
  maxCharacters: number,
  maxDepth = 4
): object | string | undefined => {
  const view = shallowObjectView(obj, maxDepth);
  if (maxDepth > 1 && view && JSON.stringify(view).length > maxCharacters) {
    return shallowObjectViewTruncated(view, maxCharacters, maxDepth - 1);
  }
  return view;
};

interface TypedProperty {
  type: string;
  [key: string]: unknown;
}

interface NestedObject {
  [key: string]: TypedProperty | NestedObject;
}

export const mapFieldDescriptorToNestedObject = <T extends { name: string; type: string }>(
  arr: T[]
): NestedObject => {
  return arr.reduce<NestedObject>((acc, obj) => {
    const keys = obj.name.split('.');
    keys.reduce((nested: NestedObject, key, index) => {
      if (!(key in nested)) {
        nested[key] =
          index === keys.length - 1
            ? (Object.fromEntries(
                Object.entries(obj).filter(([k]) => k !== 'name')
              ) as TypedProperty)
            : {};
      }
      return nested[key] as NestedObject;
    }, acc);
    return acc;
  }, {});
};
