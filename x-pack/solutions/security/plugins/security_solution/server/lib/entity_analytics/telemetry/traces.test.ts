/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ANALYTICS_SPAN_NAMES, runWithSpan, wrapTaskRun } from './traces';

describe('entity analytics traces', () => {
  it('prefixes every span name with entity_analytics', () => {
    const names = Object.values(ENTITY_ANALYTICS_SPAN_NAMES);
    expect(names.length).toBeGreaterThan(0);
    names.forEach((name) => {
      expect(name.startsWith('entity_analytics.')).toBe(true);
    });
  });

  it('runWithSpan invokes the callback and returns its result', () => {
    const result = runWithSpan({
      name: ENTITY_ANALYTICS_SPAN_NAMES.maintainerRun,
      namespace: 'default',
      cb: () => 42,
    });

    expect(result).toBe(42);
  });

  it('wrapTaskRun invokes the run callback and returns its result', async () => {
    const result = await wrapTaskRun({
      spanName: ENTITY_ANALYTICS_SPAN_NAMES.watchlistTaskRun,
      namespace: 'default',
      run: async () => 'ok',
    });

    expect(result).toBe('ok');
  });
});
