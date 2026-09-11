/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

/**
 * SHA-256 over NFKC-normalized parts, each length-prefixed.
 *
 * A plain `join(':')` is ambiguous: `['a:b', 'c']` and `['a', 'b:c']` produce the
 * same seed, so two different items collide on one fingerprint and the second is
 * deduplicated away as though it had already been ingested. The parts here are
 * feed-controlled titles, URLs, and ids, which routinely contain colons, so this
 * is reachable rather than theoretical.
 *
 * Length-prefixing makes the seed unambiguous. Nothing outside this module
 * recomputes these values (the workflows only pass `content_fingerprint` through),
 * so the change is safe; already-stored reports will be re-ingested once under
 * their new fingerprint.
 */
export const buildFingerprint = (parts: ReadonlyArray<string | undefined | null>): string => {
  const seed = parts
    .map((part) => (part ?? '').trim().normalize('NFKC'))
    .map((part) => `${part.length}:${part}`)
    .join('');
  return createHash('sha256').update(seed).digest('hex');
};
