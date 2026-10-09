/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAutomationsRunsInRange } from './use_automations';
import { useAutomationUsage } from './use_automation_usage';

jest.mock('./use_automations', () => ({ useAutomationsRunsInRange: jest.fn(() => []) }));

const calls = () => jest.mocked(useAutomationsRunsInRange).mock.calls;
const todayStarts = () => calls().map(([, startedAfter]) => startedAfter);

describe('useAutomationUsage', () => {
  afterEach(() => jest.useRealTimers());

  it('moves today to the new UTC day when the range is refreshed after midnight', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01T23:59:00.000Z'));
    const range = { start: '2026-09-30T00:00:00.000Z', end: '2026-10-01T23:59:00.000Z' };
    const { rerender } = renderHook(
      ({ refreshedAt }) => useAutomationUsage([], range, refreshedAt),
      { initialProps: { refreshedAt: Date.now() } }
    );
    expect(todayStarts()).toContain('2026-10-01T00:00:00.000Z');

    jest.setSystemTime(new Date('2026-10-02T00:01:00.000Z'));
    rerender({ refreshedAt: Date.now() });

    expect(todayStarts()).toContain('2026-10-02T00:00:00.000Z');
  });

  it('resolves a relative range again when refreshed', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
    const range = { start: 'now-1h', end: 'now' };
    const { result, rerender } = renderHook(
      ({ refreshedAt }) => useAutomationUsage([], range, refreshedAt),
      { initialProps: { refreshedAt: Date.now() } }
    );
    expect(result.current.runRange.startedBefore).toBe('2026-10-01T12:00:00.000Z');

    jest.setSystemTime(new Date('2026-10-01T12:30:00.000Z'));
    rerender({ refreshedAt: Date.now() });

    expect(result.current.runRange).toEqual({
      startedAfter: '2026-10-01T11:30:00.000Z',
      startedBefore: '2026-10-01T12:30:00.000Z',
    });
  });
});
