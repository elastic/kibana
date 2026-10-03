/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertZeroEnvelopeRoot } from '../../telemetry';
import { createVerifiedChainCache } from './verified_chain_cache';

const root: AlertZeroEnvelopeRoot = {
  context: {},
  id: 'exec-root',
  originManagedWorkflowId: 'system-security-floor-attack-discovery',
  spaceId: 'default',
  triggeredBy: 'scheduled',
  workflowDefinition: { consts: {} },
};

// lru-cache reads a start time of 0 as "no TTL", so the fake clock starts later.
const START = 10_000;

const createClock = () => {
  const clock = { now: START };
  return { clock, now: () => clock.now };
};

describe('createVerifiedChainCache', () => {
  it('returns the root for every execution of a verified chain', () => {
    const cache = createVerifiedChainCache();
    cache.set(['exec-review', 'exec-runner', 'exec-root'], { root, spaceId: 'default' });

    expect(
      ['exec-review', 'exec-runner', 'exec-root'].map((id) => cache.get(id, 'default'))
    ).toEqual([root, root, root]);
  });

  it('misses an execution that was never verified', () => {
    const cache = createVerifiedChainCache();

    expect(cache.get('exec-unknown', 'default')).toBeUndefined();
  });

  it('misses a verified execution looked up from another space', () => {
    const cache = createVerifiedChainCache();
    cache.set(['exec-review'], { root, spaceId: 'default' });

    expect(cache.get('exec-review', 'space-b')).toBeUndefined();
  });

  it.each([
    { elapsedMs: 1001, expected: undefined, title: 'expires entries after the TTL' },
    { elapsedMs: 999, expected: root, title: 'keeps entries within the TTL' },
  ])('$title', ({ elapsedMs, expected }) => {
    const { clock, now } = createClock();
    const cache = createVerifiedChainCache({ now, ttlMs: 1000 });
    cache.set(['exec-review'], { root, spaceId: 'default' });
    clock.now = START + elapsedMs;

    expect(cache.get('exec-review', 'default')).toBe(expected);
  });

  it('evicts the least recently used entry beyond its capacity', () => {
    const cache = createVerifiedChainCache({ max: 2 });
    cache.set(['exec-a', 'exec-b', 'exec-c'], { root, spaceId: 'default' });

    expect(cache.get('exec-a', 'default')).toBeUndefined();
  });
});
