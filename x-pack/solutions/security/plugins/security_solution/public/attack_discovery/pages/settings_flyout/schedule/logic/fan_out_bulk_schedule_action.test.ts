/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fanOutBulkScheduleAction } from './fan_out_bulk_schedule_action';

describe('fanOutBulkScheduleAction', () => {
  it('calls the action once per id', async () => {
    const action = jest.fn().mockResolvedValue(undefined);

    await fanOutBulkScheduleAction({ action, ids: ['a', 'b', 'c'] });

    expect(action).toHaveBeenCalledTimes(3);
    expect(action).toHaveBeenCalledWith('a');
    expect(action).toHaveBeenCalledWith('b');
    expect(action).toHaveBeenCalledWith('c');
  });

  it('returns every id as succeeded when all actions resolve', async () => {
    const action = jest.fn().mockResolvedValue(undefined);

    const result = await fanOutBulkScheduleAction({ action, ids: ['a', 'b'] });

    expect(result).toEqual({ errors: [], ids: ['a', 'b'], total: 2 });
  });

  it('excludes failed ids and reports them as per-id errors (partial success)', async () => {
    const action = jest.fn((id: string) =>
      id === 'b' ? Promise.reject(new Error('nope')) : Promise.resolve(undefined)
    );

    const result = await fanOutBulkScheduleAction({ action, ids: ['a', 'b', 'c'] });

    expect(result.ids).toEqual(['a', 'c']);
    expect(result.total).toBe(3);
    expect(result.errors).toEqual([{ message: 'nope', rule: { id: 'b', name: 'b' } }]);
  });

  it('does not throw when every action fails; returns all as errors', async () => {
    const action = jest.fn().mockRejectedValue(new Error('all bad'));

    const result = await fanOutBulkScheduleAction({ action, ids: ['a', 'b'] });

    expect(result.ids).toEqual([]);
    expect(result.total).toBe(2);
    expect(result.errors).toEqual([
      { message: 'all bad', rule: { id: 'a', name: 'a' } },
      { message: 'all bad', rule: { id: 'b', name: 'b' } },
    ]);
  });

  it('stringifies non-Error rejections', async () => {
    const action = jest.fn().mockRejectedValue('boom');

    const result = await fanOutBulkScheduleAction({ action, ids: ['a'] });

    expect(result.errors).toEqual([{ message: 'boom', rule: { id: 'a', name: 'a' } }]);
    expect(result.ids).toEqual([]);
  });

  it('preserves input id order regardless of resolution order', async () => {
    const action = jest.fn((id: string) =>
      id === 'a'
        ? new Promise<void>((resolve) => setTimeout(resolve, 10))
        : Promise.resolve(undefined)
    );

    const result = await fanOutBulkScheduleAction({ action, ids: ['a', 'b'] });

    expect(result.ids).toEqual(['a', 'b']);
  });
});
