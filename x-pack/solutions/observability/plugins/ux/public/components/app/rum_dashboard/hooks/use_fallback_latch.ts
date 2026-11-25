/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';

/**
 * Remembers a "keep the fallback enabled" decision for as long as `key` stays the same.
 *
 * `latchWhen` is typically derived from a request that has settled, so it drops back to false the
 * moment that request is re-issued. Anything gated directly on it is therefore disabled mid-flight.
 * The latch holds the decision across those re-issues until `key` changes or `clearWhen` is true.
 *
 * State machine:
 *   neutral --[latchWhen]--> latched(key)
 *   latched(key) --[key changes | clearWhen]--> neutral
 */
export function useFallbackLatch(
  key: string | undefined,
  latchWhen: boolean,
  clearWhen: boolean
): boolean {
  // Wrapped so that "nothing latched" stays distinct from "latched for an undefined key".
  const latchedFor = useRef<{ key: string | undefined } | undefined>(undefined);

  if (latchedFor.current !== undefined && (latchedFor.current.key !== key || clearWhen)) {
    latchedFor.current = undefined;
  }
  if (latchWhen) {
    latchedFor.current = { key };
  }

  return latchedFor.current !== undefined && latchedFor.current.key === key;
}
