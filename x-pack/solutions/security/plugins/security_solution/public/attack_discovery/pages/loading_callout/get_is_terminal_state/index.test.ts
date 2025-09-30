/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIsTerminalState } from '.';

describe('getIsTerminalState', () => {
  it.each<['started' | 'succeeded' | 'failed' | 'canceled' | 'dismissed' | undefined, boolean]>([
    ['succeeded', true],
    ['failed', true],
    ['canceled', true],
    ['started', false],
    ['dismissed', false],
    [undefined, false],
  ])('returns %s as %s', (status, expected) => {
    expect(getIsTerminalState(status)).toBe(expected);
  });
});
