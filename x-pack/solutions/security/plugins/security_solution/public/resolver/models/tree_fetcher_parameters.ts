/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TreeFetcherParameters } from '../types';

/**
 * Determine if two instances of `TreeFetcherParameters` are equivalent. Use this to determine if
 * a change to a `TreeFetcherParameters` warrants invalidating a request or response.
 */
export function equal(param1: TreeFetcherParameters, param2?: TreeFetcherParameters): boolean {
  if (!param2) {
    return false;
  }
  if (param1 === param2) {
    return true;
  }
  if (
    param1.databaseDocumentID !== param2.databaseDocumentID ||
    param1.filters.from !== param2.filters.from ||
    param1.filters.to !== param2.filters.to
  ) {
    return false;
  }
  return arraysContainTheSameElements(param1.indices, param2.indices);
}

function arraysContainTheSameElements(first: unknown[], second: unknown[]): boolean {
  if (first === second) {
    return true;
  }
  if (first.length !== second.length) {
    return false;
  }
  const firstSet = new Set(first);
  for (let index = 0; index < second.length; index++) {
    if (!firstSet.has(second[index])) {
      return false;
    }
  }
  return true;
}
