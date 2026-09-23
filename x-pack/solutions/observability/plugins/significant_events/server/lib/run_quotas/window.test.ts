/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveDailyWindow } from './window';

describe('resolveDailyWindow', () => {
  it('uses UTC day boundaries', () => {
    expect(resolveDailyWindow(new Date('2026-08-31T23:59:59.999Z'))).toEqual({
      start: '2026-08-31T00:00:00.000Z',
      resetsAt: '2026-09-01T00:00:00.000Z',
      timezone: 'UTC',
    });
  });
});
