/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_URL_LENGTH } from '../../../common/threat_intel';

/** Returns a bounded, credential-free HTTP(S) provenance URL. */
export const normalizeProvenanceUrl = (value: string | undefined): string | undefined => {
  if (!value || value.length > MAX_URL_LENGTH) return undefined;

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;

    url.username = '';
    url.password = '';
    const normalized = url.toString();
    return normalized.length <= MAX_URL_LENGTH ? normalized : undefined;
  } catch {
    return undefined;
  }
};
