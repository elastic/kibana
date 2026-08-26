/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

/** SHA-256 of colon-joined NFKC-normalized parts; matches workflow `| sha256` filter. */
export const buildFingerprint = (parts: ReadonlyArray<string | undefined | null>): string => {
  const seed = parts.map((part) => (part ?? '').trim().normalize('NFKC')).join(':');
  return createHash('sha256').update(seed).digest('hex');
};
