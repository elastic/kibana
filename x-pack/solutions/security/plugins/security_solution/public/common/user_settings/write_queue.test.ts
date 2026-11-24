/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserSettingsWriteQueue } from './write_queue';

const OUTBOX_STORAGE_KEY = 'securitySolution.userSettings.outbox';

const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { body: { statusCode: status } });

const readOutbox = () => JSON.parse(window.sessionStorage.getItem(OUTBOX_STORAGE_KEY) ?? '{}');

describe('UserSettingsWriteQueue', () => {
  let set: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    window.sessionStorage.clear();
    set = jest.fn(async (_key: string, value: unknown) => value);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces, keeping only the latest value per key', async () => {
    const queue = new UserSettingsWriteQueue({ set });

    queue.enqueue('a', 1);
    queue.enqueue('a', 2);
    queue.enqueue('a', 3);
    expect(set).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1000);

    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith('a', 3);
  });

  it('exposes pending and in flight values until the write is confirmed', async () => {
    let resolveWrite: () => void = () => {};
    set.mockImplementationOnce(() => new Promise<void>((resolve) => (resolveWrite = resolve)));
    const queue = new UserSettingsWriteQueue({ set });

    queue.enqueue('a', 'new');
    expect(queue.getPending('a')).toBe('new');

    await jest.advanceTimersByTimeAsync(1000);
    expect(queue.getPending('a')).toBe('new');
    expect(queue.getUnsaved()).toEqual([['a', 'new']]);

    resolveWrite();
    await jest.advanceTimersByTimeAsync(0);
    expect(queue.getPending('a')).toBeUndefined();
    expect(queue.getUnsaved()).toEqual([]);
  });

  it('sends one request at a time', async () => {
    let active = 0;
    let maxActive = 0;
    set.mockImplementation(async (_key: string, value: unknown) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 50));
      active--;
      return value;
    });
    const queue = new UserSettingsWriteQueue({ set });

    queue.enqueue('a', 1);
    queue.enqueue('b', 2);
    queue.enqueue('c', 3);
    await jest.advanceTimersByTimeAsync(1000 + 3 * 50);

    expect(set).toHaveBeenCalledTimes(3);
    expect(maxActive).toBe(1);
  });

  it('retries on a version conflict and then succeeds', async () => {
    set.mockRejectedValueOnce(httpError(409));
    const queue = new UserSettingsWriteQueue({ set });

    queue.enqueue('a', 1);
    await jest.advanceTimersByTimeAsync(1000 + 500);

    expect(set).toHaveBeenCalledTimes(2);
    expect(queue.getPending('a')).toBeUndefined();
  });

  it('does not retry a rejected value', async () => {
    set.mockRejectedValue(httpError(400));
    const queue = new UserSettingsWriteQueue({ set });

    queue.enqueue('a', 1);
    await jest.advanceTimersByTimeAsync(60000);

    expect(set).toHaveBeenCalledTimes(1);
    expect(readOutbox()).toEqual({});
  });

  describe('outbox', () => {
    it('stores a value synchronously and removes it once the server confirms it', async () => {
      const queue = new UserSettingsWriteQueue({ set });

      queue.enqueue('a', { columns: ['x'] });
      expect(readOutbox().a.value).toEqual({ columns: ['x'] });

      await jest.advanceTimersByTimeAsync(1000);
      expect(readOutbox()).toEqual({});
    });

    it('keeps the value when retries run out', async () => {
      set.mockRejectedValue(httpError(503));
      const queue = new UserSettingsWriteQueue({ set });

      queue.enqueue('a', 1);
      await jest.advanceTimersByTimeAsync(120000);

      expect(readOutbox().a.value).toBe(1);
    });

    it('lets a new queue (a reloaded page) read and write what the old page left unsaved', async () => {
      new UserSettingsWriteQueue({ set }).enqueue('a', 'unsaved');

      const reloaded = new UserSettingsWriteQueue({ set });
      reloaded.replayOutbox();
      expect(reloaded.getPending('a')).toBe('unsaved');

      await jest.advanceTimersByTimeAsync(1000);
      expect(set).toHaveBeenCalledWith('a', 'unsaved');
      expect(readOutbox()).toEqual({});
    });

    it('ignores and removes expired entries', () => {
      window.sessionStorage.setItem(
        OUTBOX_STORAGE_KEY,
        JSON.stringify({ old: { value: 1, at: Date.now() - 10 * 60 * 1000 } })
      );
      const queue = new UserSettingsWriteQueue({ set });

      queue.replayOutbox();

      expect(queue.getPending('old')).toBeUndefined();
      expect(readOutbox()).toEqual({});
    });

    it('does not override a value enqueued before the replay', () => {
      window.sessionStorage.setItem(
        OUTBOX_STORAGE_KEY,
        JSON.stringify({ a: { value: 'old', at: Date.now() } })
      );
      const queue = new UserSettingsWriteQueue({ set });

      queue.enqueue('a', 'newer');
      queue.replayOutbox();

      expect(queue.getPending('a')).toBe('newer');
    });

    it('still works when sessionStorage is unavailable', async () => {
      const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });
      const queue = new UserSettingsWriteQueue({ set });

      queue.enqueue('a', 1);
      await jest.advanceTimersByTimeAsync(1000);

      expect(set).toHaveBeenCalledWith('a', 1);
      spy.mockRestore();
    });
  });
});
