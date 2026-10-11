/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IN_FLIGHT_CEILING, TM_DELAY_LIMIT_MS } from './constants';
import { readHeadroom } from './headroom';

describe('readHeadroom', () => {
  it('is ok with the free slots when Task Manager keeps up', async () => {
    await expect(
      readHeadroom({ countInFlight: async () => 12, readTmLagMs: async () => 1000 })
    ).resolves.toEqual({ status: 'ok', inFlight: 12, slots: IN_FLIGHT_CEILING - 12 });
  });

  it('is behind when workflow:run tasks wait longer than the delay limit', async () => {
    await expect(
      readHeadroom({
        countInFlight: async () => 0,
        readTmLagMs: async () => TM_DELAY_LIMIT_MS + 1,
      })
    ).resolves.toEqual({ status: 'behind', lagMs: TM_DELAY_LIMIT_MS + 1 });
  });

  it('is unknown, not ok, when the Task Manager lag cannot be read', async () => {
    await expect(
      readHeadroom({
        countInFlight: async () => 0,
        readTmLagMs: async () => {
          throw new Error('aggregate failed');
        },
      })
    ).resolves.toEqual({ status: 'unknown' });
  });

  it('assumes half the ceiling is in flight when the count cannot be read', async () => {
    await expect(
      readHeadroom({
        countInFlight: async () => {
          throw new Error('list failed');
        },
        readTmLagMs: async () => 0,
      })
    ).resolves.toEqual({
      status: 'ok',
      inFlight: IN_FLIGHT_CEILING / 2,
      slots: IN_FLIGHT_CEILING / 2,
    });
  });

  it('never reports negative slots', async () => {
    await expect(
      readHeadroom({ countInFlight: async () => 99, readTmLagMs: async () => 0 })
    ).resolves.toEqual({ status: 'ok', inFlight: 99, slots: 0 });
  });
});
