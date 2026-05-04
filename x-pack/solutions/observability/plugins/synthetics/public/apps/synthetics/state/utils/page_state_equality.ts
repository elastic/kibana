/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Deep equality for individual `pageState` slots used by the reducers to
 * suppress no-op writes that would create a new reference and re-trigger
 * debounced fetches. Treats `undefined` and `[]` as equivalent (both mean
 * "no filter applied") and compares array contents element-by-element.
 */
export const isPageStateSlotEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;

  const aEmpty = a === undefined || (Array.isArray(a) && a.length === 0);
  const bEmpty = b === undefined || (Array.isArray(b) && b.length === 0);
  if (aEmpty && bEmpty) return true;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  return false;
};
