/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiEndpointId } from '../../../common/api_endpoints';

/**
 * Reads the current per-endpoint flags directly from localStorage. Merging
 * writes on top of this fresh read (instead of a functional state update)
 * avoids react-use's useLocalStorage stale-closure issue, where functional
 * updaters always receive the mount-time value and drop flags written later
 * in the same mount.
 */
export const readStoredFlags = (storageKey: string): Partial<Record<ApiEndpointId, boolean>> => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}');
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
};
