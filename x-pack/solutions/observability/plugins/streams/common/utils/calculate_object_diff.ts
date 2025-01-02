/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isPlainObject } from 'lodash';

interface DiffResult<T> {
  added: Partial<T>;
  removed: Partial<T>;
}

interface Obj {
  [key: PropertyKey]: Obj | unknown;
}

/**
 * Compares two JSON objects and calculates the added and removed properties, including nested properties.
 * @param oldObj - The base object.
 * @param newObj - The comparison object.
 * @returns An object containing added and removed properties.
 */
export function calculateObjectDiff(oldObj: Obj, newObj?: Obj): DiffResult<Obj> {
  const added: Partial<Obj> = {};
  const removed: Partial<Obj> = {};

  if (!newObj) return { added, removed };

  function diffRecursive(
    base: Obj,
    compare: Obj,
    addedMap: Partial<Obj>,
    removedMap: Partial<Obj>
  ): void {
    for (const key in compare) {
      if (!(key in base)) {
        addedMap[key] = compare[key];
      } else if (isPlainObject(base[key]) && isPlainObject(compare[key])) {
        addedMap[key] = {};
        removedMap[key] = {};
        diffRecursive(
          base[key] as Obj,
          compare[key] as Obj,
          addedMap[key] as Obj,
          removedMap[key] as Obj
        );
        if (isEmpty(addedMap[key])) delete addedMap[key];
        if (isEmpty(removedMap[key])) delete removedMap[key];
      }
    }

    for (const key in base) {
      if (!(key in compare)) {
        removed[key] = base[key];
      }
    }
  }

  diffRecursive(oldObj, newObj, added, removed);

  return { added, removed };
}
