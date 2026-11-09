/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { startWriteGate } from './write_gate';

const logger = { warn: jest.fn() } as unknown as Logger;
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe('startWriteGate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(logger.warn).mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('stays closed until the install succeeds', async () => {
    const ensure = jest.fn().mockResolvedValue(true);
    const gate = startWriteGate({ ensure, logger, label: 'X' });

    expect(gate.isOpen()).toBe(false);
    await flush();

    expect(gate.isOpen()).toBe(true);
  });

  it('retries a failed install, so one bad boot does not turn writes off for good', async () => {
    const ensure = jest
      .fn()
      .mockRejectedValueOnce(new Error('security not ready'))
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);
    const gate = startWriteGate({ ensure, logger, label: 'X', retryDelaysMs: [10, 20] });

    await flush();
    expect(gate.isOpen()).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('security not ready'));

    jest.advanceTimersByTime(10);
    await flush();
    expect(gate.isOpen()).toBe(false);

    jest.advanceTimersByTime(20);
    await flush();
    expect(gate.isOpen()).toBe(true);
    expect(ensure).toHaveBeenCalledTimes(3);
  });

  it('stops retrying when stopped', async () => {
    const ensure = jest.fn().mockResolvedValue(false);
    const gate = startWriteGate({ ensure, logger, label: 'X', retryDelaysMs: [10] });
    await flush();

    gate.stop();
    jest.advanceTimersByTime(1000);
    await flush();

    expect(ensure).toHaveBeenCalledTimes(1);
  });
});
