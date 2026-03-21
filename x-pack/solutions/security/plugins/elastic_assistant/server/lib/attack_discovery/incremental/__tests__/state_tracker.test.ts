/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateTracker } from '../state_tracker';

describe('StateTracker', () => {
  const mockEsClient = {
    bulk: jest.fn(async () => ({ errors: false })),
    get: jest.fn(),
    search: jest.fn(),
  };

  it('should mark alerts as processed', async () => {
    const tracker = new StateTracker(mockEsClient as any, 'test-session');

    await tracker.markProcessed(['alert-1', 'alert-2'], 1);

    expect(mockEsClient.bulk).toHaveBeenCalled();
  });

  it('should identify processed alerts', async () => {
    mockEsClient.get.mockResolvedValueOnce({ found: true });

    const tracker = new StateTracker(mockEsClient as any, 'test-session');
    const isProcessed = await tracker.isProcessed('alert-1');

    expect(isProcessed).toBe(true);
  });

  it('should filter unprocessed alerts', async () => {
    mockEsClient.search.mockResolvedValueOnce({
      hits: { hits: [{ _source: { alertId: 'alert-1' } }] },
    });

    const tracker = new StateTracker(mockEsClient as any, 'test-session');
    const alerts = [{ id: 'alert-1' }, { id: 'alert-2' }];

    const unprocessed = await tracker.filterUnprocessed(alerts);

    expect(unprocessed).toHaveLength(1);
    expect(unprocessed[0].id).toBe('alert-2');
  });
});
