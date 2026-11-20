/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const HAS_DATA_STORAGE_KEY = 'searchHomepage.hasData';

/** Whether this browser has seen the deployment hold data; false where storage cannot be read. */
export const hasSeenData = (): boolean => {
  try {
    return localStorage.getItem(HAS_DATA_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

/** Remembers whether the deployment holds data, for the next page load. */
export const storeHasData = (hasData: boolean): void => {
  try {
    localStorage.setItem(HAS_DATA_STORAGE_KEY, String(hasData));
  } catch {
    // Without storage the chrome is decided again from the cluster on the next load.
  }
};
