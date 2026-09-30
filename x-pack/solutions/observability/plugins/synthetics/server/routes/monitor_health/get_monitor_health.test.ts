/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import { MAX_MONITOR_FANOUT_SIZE } from '../zod_query';
import { getMonitorsHealthRoute } from './get_monitor_health';

describe('getMonitorsHealthRoute', () => {
  const bodySchema = (getMonitorsHealthRoute().validate as { body: z.ZodType }).body;

  it(`rejects more than ${MAX_MONITOR_FANOUT_SIZE} monitor ids`, () => {
    const monitorIds = Array.from(
      { length: MAX_MONITOR_FANOUT_SIZE + 1 },
      (_, i) => `monitor-id-${i}`
    );
    expect(() => bodySchema.parse({ monitorIds })).toThrow(
      new RegExp(`too big|maximum|<=${MAX_MONITOR_FANOUT_SIZE}`, 'i')
    );
  });

  it('accepts a non-empty monitorIds array within the cap', () => {
    expect(() => bodySchema.parse({ monitorIds: ['monitor-id-1'] })).not.toThrow();
  });

  it('rejects unknown keys', () => {
    expect(bodySchema.safeParse({ monitorIds: ['monitor-id-1'], extra: true }).success).toBe(false);
  });
});
