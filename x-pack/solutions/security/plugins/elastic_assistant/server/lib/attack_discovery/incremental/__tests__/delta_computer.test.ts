/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeDelta } from '../delta_computer';
import type { StateTracker } from '../state_tracker';

describe('computeDelta', () => {
  it('should return only unprocessed alerts', async () => {
    const mockTracker = {
      filterUnprocessed: jest.fn(async alerts =>
        alerts.filter(a => a.id !== 'alert-1')  // alert-1 already processed
      ),
    } as any;

    const alerts = [
      { id: 'alert-1', content: 'Alert 1' },
      { id: 'alert-2', content: 'Alert 2' },
      { id: 'alert-3', content: 'Alert 3' },
    ];

    const delta = await computeDelta(alerts, mockTracker);

    expect(delta).toHaveLength(2);
    expect(delta.map(a => a.id)).toEqual(['alert-2', 'alert-3']);
  });

  it('should return empty if all processed', async () => {
    const mockTracker = {
      filterUnprocessed: jest.fn(async () => []),
    } as any;

    const delta = await computeDelta([{ id: 'alert-1' }], mockTracker);

    expect(delta).toEqual([]);
  });
});
