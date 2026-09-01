/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StixBundle } from './types';

/** Fetches the enterprise ATT&CK STIX bundle for a mitre/cti tag, e.g. 'ATT&CK-v19.1'. */
export const fetchStixBundle = async (tag: string): Promise<StixBundle> => {
  const url = `https://raw.githubusercontent.com/mitre/cti/${tag}/enterprise-attack/enterprise-attack.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch MITRE bundle from ${url}: ${response.status} ${response.statusText}`
    );
  }
  return (await response.json()) as StixBundle;
};
