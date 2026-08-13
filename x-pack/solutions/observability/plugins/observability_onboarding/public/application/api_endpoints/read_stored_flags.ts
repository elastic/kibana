/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiEndpointId } from '../../../common/api_endpoints';

export type StoredFlags = Partial<Record<ApiEndpointId, true>>;

export const sanitizeStoredFlags = (value: unknown): StoredFlags => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(Object.entries(value).filter(([, flag]) => flag === true));
};

/**
 * Reads the current per-endpoint flags directly from localStorage. Merging
 * writes on top of this fresh read (instead of a functional state update)
 * avoids react-use's useLocalStorage stale-closure issue, where functional
 * updaters always receive the mount-time value and drop flags written later
 * in the same mount.
 */
export const readStoredFlags = (storageKey: string): StoredFlags => {
  try {
    return sanitizeStoredFlags(JSON.parse(window.localStorage.getItem(storageKey) ?? '{}'));
  } catch {
    return {};
  }
};
