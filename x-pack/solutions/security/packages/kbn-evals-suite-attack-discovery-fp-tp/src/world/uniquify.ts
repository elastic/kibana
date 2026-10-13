/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FP_TP_TWIN_SEED_LABEL } from './constants';

/**
 * Run marker for one run. Registry alert, event, host, and process ids are digests
 * of it, so each run seeds documents no other run shares.
 */
export const toRunMarker = (suffix: string): string => `${FP_TP_TWIN_SEED_LABEL}-${suffix}`;

/**
 * Suffixes the names the run marker leaves shared (a scenario's attack id, host
 * names, user names). Rewrites every string value in the tree, gold ids included,
 * so references between documents stay consistent.
 */
export const uniquify = <T>(value: T, suffix: string, sharedNames: readonly string[]): T => {
  if (typeof value === 'string') {
    return sharedNames.reduce(
      (current, name) => current.split(name).join(`${name}-${suffix}`),
      value
    ) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => uniquify(item, suffix, sharedNames)) as T;
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, uniquify(item, suffix, sharedNames)])
    ) as T;
  }
  return value;
};
