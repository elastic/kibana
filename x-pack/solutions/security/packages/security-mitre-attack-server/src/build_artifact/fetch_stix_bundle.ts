/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StixBundle } from './types';

/** Fetches a STIX bundle from the given URL. */
export const fetchStixBundle = async (url: string): Promise<StixBundle> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch MITRE bundle from ${url}: ${response.status} ${response.statusText}`
    );
  }
  return (await response.json()) as StixBundle;
};
