/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const GATE_HINT_STORAGE_KEY = 'searchHomepage.ingestGated';

/**
 * Whether this browser last saw the space at this base path held behind the ingest gate. Only a
 * hint for the first paint; false where storage cannot be read.
 */
export const hasGateHint = (basePath: string): boolean => {
  try {
    return localStorage.getItem(GATE_HINT_STORAGE_KEY) === basePath;
  } catch {
    return false;
  }
};

/** Remembers, for the next page load, whether the space at this base path is gated. */
export const storeGateHint = (basePath: string, isGated: boolean): void => {
  try {
    if (isGated) {
      localStorage.setItem(GATE_HINT_STORAGE_KEY, basePath);
    } else if (localStorage.getItem(GATE_HINT_STORAGE_KEY) === basePath) {
      localStorage.removeItem(GATE_HINT_STORAGE_KEY);
    }
  } catch {
    // Without storage the chrome shows until the cluster has answered on the next load.
  }
};
