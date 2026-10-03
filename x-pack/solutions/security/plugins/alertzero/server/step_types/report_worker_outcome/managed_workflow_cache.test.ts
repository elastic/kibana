/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createManagedWorkflowCache } from './managed_workflow_cache';

// lru-cache reads a start time of 0 as "no TTL", so the fake clock starts later.
const START = 10_000;

const createClock = () => {
  const clock = { now: START };
  return { clock, now: () => clock.now };
};

describe('createManagedWorkflowCache', () => {
  it('knows a workflow it remembered in that space', () => {
    const cache = createManagedWorkflowCache();
    cache.remember('wf-review', 'default');

    expect(cache.has('wf-review', 'default')).toBe(true);
  });

  it('does not know a workflow it never remembered', () => {
    const cache = createManagedWorkflowCache();

    expect(cache.has('wf-review', 'default')).toBe(false);
  });

  it('does not know a remembered workflow in another space', () => {
    const cache = createManagedWorkflowCache();
    cache.remember('wf-review', 'default');

    expect(cache.has('wf-review', 'space-b')).toBe(false);
  });

  it('keeps ids that would collide if joined with a separator apart', () => {
    const cache = createManagedWorkflowCache();
    cache.remember('a:b', 'c');

    expect(cache.has('a', 'b:c')).toBe(false);
  });

  it.each([
    { elapsedMs: 1001, expected: false, title: 'expires entries after the TTL' },
    { elapsedMs: 999, expected: true, title: 'keeps entries within the TTL' },
  ])('$title', ({ elapsedMs, expected }) => {
    const { clock, now } = createClock();
    const cache = createManagedWorkflowCache({ now, ttlMs: 1000 });
    cache.remember('wf-review', 'default');
    clock.now = START + elapsedMs;

    expect(cache.has('wf-review', 'default')).toBe(expected);
  });

  it('evicts the least recently used entry beyond its capacity', () => {
    const cache = createManagedWorkflowCache({ max: 2 });
    ['wf-a', 'wf-b', 'wf-c'].forEach((workflowId) => cache.remember(workflowId, 'default'));

    expect(cache.has('wf-a', 'default')).toBe(false);
  });
});
