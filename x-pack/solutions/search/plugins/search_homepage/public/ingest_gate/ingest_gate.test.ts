/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIngestGate } from './ingest_gate';
import type { IngestGate, IngestGateParams, IngestGateStatus } from './ingest_gate';

const POLL_INTERVAL_MS = 1000;

describe('createIngestGate', () => {
  let gate: IngestGate | undefined;

  const start = (params: Partial<IngestGateParams> = {}) => {
    const fetchHasData = jest.fn().mockResolvedValue(false);
    const statuses: IngestGateStatus[] = [];
    const created = createIngestGate({
      isInScope: () => Promise.resolve(true),
      fetchHasData,
      hasSeenData: false,
      pollIntervalMs: POLL_INTERVAL_MS,
      ...params,
    });
    created.status$.subscribe((status) => statuses.push(status));
    gate = created;
    return { gate: created, fetchHasData: params.fetchHasData ?? fetchHasData, statuses };
  };

  const flush = () => jest.advanceTimersByTimeAsync(0);

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    gate?.stop();
    gate = undefined;
    jest.useRealTimers();
  });

  it('is unknown until the cluster has answered', async () => {
    let answer: (hasData: boolean) => void = () => {};
    const fetchHasData = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          answer = resolve;
        })
    );
    const { statuses } = start({ fetchHasData });

    await flush();
    expect(fetchHasData).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(['unknown']);

    answer(false);
    await flush();
    expect(statuses).toEqual(['unknown', 'gated']);
  });

  it('opens without polling when the cluster holds data', async () => {
    const { fetchHasData, statuses } = start({ fetchHasData: jest.fn().mockResolvedValue(true) });

    await flush();
    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);

    expect(statuses).toEqual(['unknown', 'open']);
    expect(fetchHasData).toHaveBeenCalledTimes(1);
  });

  it('never asks the cluster outside the Elasticsearch solution', async () => {
    const {
      fetchHasData,
      gate: created,
      statuses,
    } = start({
      isInScope: () => Promise.resolve(false),
    });

    await flush();
    created.reportHasData(false);
    await expect(created.recheck()).resolves.toBe('open');
    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);

    expect(statuses).toEqual(['unknown', 'open']);
    expect(fetchHasData).not.toHaveBeenCalled();
  });

  it('opens when the solution cannot be determined', async () => {
    const { fetchHasData, statuses } = start({
      isInScope: () => Promise.reject(new Error('no space')),
    });

    await flush();

    expect(statuses).toEqual(['unknown', 'open']);
    expect(fetchHasData).not.toHaveBeenCalled();
  });

  it('opens without asking when this browser has seen data', async () => {
    const { fetchHasData, statuses } = start({ hasSeenData: true });

    await flush();

    expect(statuses).toEqual(['unknown', 'open']);
    expect(fetchHasData).not.toHaveBeenCalled();
  });

  it('polls while gated and stops once data arrives', async () => {
    const fetchHasData = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);
    const { statuses } = start({ fetchHasData });

    await flush();
    expect(statuses).toEqual(['unknown', 'gated']);

    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(fetchHasData).toHaveBeenCalledTimes(2);
    expect(statuses).toEqual(['unknown', 'gated']);

    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(statuses).toEqual(['unknown', 'gated', 'open']);

    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);
    expect(fetchHasData).toHaveBeenCalledTimes(3);
  });

  it('opens and stops polling when the first check fails', async () => {
    const fetchHasData = jest.fn().mockRejectedValue(new Error('forbidden'));
    const { statuses } = start({ fetchHasData });

    await flush();
    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);

    expect(statuses).toEqual(['unknown', 'open']);
    expect(fetchHasData).toHaveBeenCalledTimes(1);
  });

  it('opens when a later check fails', async () => {
    const fetchHasData = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockRejectedValue(new Error('unavailable'));
    const { statuses } = start({ fetchHasData });

    await flush();
    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);

    expect(statuses).toEqual(['unknown', 'gated', 'open']);
    expect(fetchHasData).toHaveBeenCalledTimes(2);
  });

  it('skips polls while the page is not visible', async () => {
    let isVisible = false;
    const { fetchHasData } = start({ isPageVisible: () => isVisible });

    await flush();
    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    expect(fetchHasData).toHaveBeenCalledTimes(1);

    isVisible = true;
    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(fetchHasData).toHaveBeenCalledTimes(2);
  });

  it('follows an answer a page reports, in both directions', async () => {
    const { gate: created, fetchHasData, statuses } = start();
    await flush();

    created.reportHasData(true);
    expect(statuses).toEqual(['unknown', 'gated', 'open']);
    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);
    expect(fetchHasData).toHaveBeenCalledTimes(1);

    created.reportHasData(false);
    expect(statuses).toEqual(['unknown', 'gated', 'open', 'gated']);
    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(fetchHasData).toHaveBeenCalledTimes(2);
  });

  it('does not ask itself while a page keeps reporting', async () => {
    const { gate: created, fetchHasData } = start();
    await flush();

    for (let report = 0; report < 5; report++) {
      await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS - 1);
      created.reportHasData(false);
    }

    expect(fetchHasData).toHaveBeenCalledTimes(1);
  });

  it('keeps a report made before the solution is known, instead of asking', async () => {
    const { gate: created, fetchHasData, statuses } = start();

    created.reportHasData(false);
    await flush();

    expect(statuses).toEqual(['unknown', 'gated']);
    expect(fetchHasData).not.toHaveBeenCalled();
  });

  it('asks at once on a recheck', async () => {
    const fetchHasData = jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const { gate: created } = start({ fetchHasData });
    await flush();

    await expect(created.recheck()).resolves.toBe('open');
    expect(fetchHasData).toHaveBeenCalledTimes(2);
  });

  it('asks nothing after it is stopped', async () => {
    const { gate: created, fetchHasData } = start();
    await flush();

    created.stop();
    await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5);

    expect(fetchHasData).toHaveBeenCalledTimes(1);
  });
});
