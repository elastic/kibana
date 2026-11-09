/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  dismissManualInvestigationFresh,
  getManualInvestigationFreshCounts,
  isManualInvestigationFresh,
  registerManualInvestigationStart,
  resetManualInvestigationFreshForTests,
  shouldDismissManualInvestigationFresh,
  subscribeManualInvestigationFresh,
  syncManualInvestigationFreshFromSections,
} from './manual_investigation_starts';

describe('manualInvestigationStarts', () => {
  const spaceA = '/s/space-a';
  const spaceB = '/s/space-b';

  beforeEach(() => {
    window.localStorage.clear();
    resetManualInvestigationFreshForTests();
  });

  it('registers, syncs severity from sections, and dismisses per space', () => {
    registerManualInvestigationStart('inv-1', spaceA);
    registerManualInvestigationStart('inv-2', spaceA);
    registerManualInvestigationStart('inv-1', spaceB);

    expect(isManualInvestigationFresh('inv-1', spaceA)).toBe(true);
    expect(isManualInvestigationFresh('inv-2', spaceB)).toBe(false);

    syncManualInvestigationFreshFromSections(spaceA, [
      { id: 'critical', investigations: [{ id: 'inv-1' }] },
      { id: 'high', investigations: [{ id: 'inv-2' }] },
    ]);

    expect(getManualInvestigationFreshCounts(spaceA)).toEqual({
      critical: 1,
      high: 1,
      medium: 0,
      low: 0,
    });

    // Running again clears severity for +N until the next finish.
    syncManualInvestigationFreshFromSections(spaceA, [
      { id: 'in-progress', investigations: [{ id: 'inv-1' }] },
      { id: 'high', investigations: [{ id: 'inv-2' }] },
    ]);
    expect(getManualInvestigationFreshCounts(spaceA)).toEqual({
      critical: 0,
      high: 1,
      medium: 0,
      low: 0,
    });
    expect(isManualInvestigationFresh('inv-1', spaceA)).toBe(true);

    dismissManualInvestigationFresh('inv-1', spaceA);
    expect(isManualInvestigationFresh('inv-1', spaceA)).toBe(false);
    expect(isManualInvestigationFresh('inv-1', spaceB)).toBe(true);
  });

  it('dismisses from live finished state, not from absence or stale fetch', () => {
    const finished = [{ id: 'critical' as const, investigations: [{ id: 'inv-1' }] }];
    const running = [{ id: 'in-progress' as const, investigations: [{ id: 'inv-1' }] }];

    expect(
      shouldDismissManualInvestigationFresh({ investigationId: 'inv-1', sections: finished })
    ).toBe(true);
    // Live finished wins over a stale by-id `in_progress: true`.
    expect(
      shouldDismissManualInvestigationFresh({
        investigationId: 'inv-1',
        sections: finished,
        fetchedInProgress: true,
      })
    ).toBe(true);
    expect(
      shouldDismissManualInvestigationFresh({
        investigationId: 'inv-1',
        sections: running,
        fetchedInProgress: false,
      })
    ).toBe(false);
    // Off-page: only the by-id fetch can confirm finished.
    expect(
      shouldDismissManualInvestigationFresh({
        investigationId: 'inv-1',
        sections: [],
        fetchedInProgress: false,
      })
    ).toBe(true);
    expect(
      shouldDismissManualInvestigationFresh({ investigationId: 'inv-1', sections: [] })
    ).toBe(false);
  });

  it('lets in-progress win when an id is in both running and a stale severity page', () => {
    registerManualInvestigationStart('inv-1', spaceA);
    syncManualInvestigationFreshFromSections(spaceA, [
      { id: 'critical', investigations: [{ id: 'inv-1' }] },
    ]);
    expect(getManualInvestigationFreshCounts(spaceA).critical).toBe(1);

    const listener = jest.fn();
    const unsubscribe = subscribeManualInvestigationFresh(listener);
    syncManualInvestigationFreshFromSections(spaceA, [
      { id: 'in-progress', investigations: [{ id: 'inv-1' }] },
      { id: 'critical', investigations: [{ id: 'inv-1' }] },
    ]);
    expect(getManualInvestigationFreshCounts(spaceA).critical).toBe(0);
    expect(isManualInvestigationFresh('inv-1', spaceA)).toBe(true);

    listener.mockClear();
    syncManualInvestigationFreshFromSections(spaceA, [
      { id: 'in-progress', investigations: [{ id: 'inv-1' }] },
      { id: 'critical', investigations: [{ id: 'inv-1' }] },
    ]);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('keeps pending memory when only setItem throws so sync does not loop', () => {
    registerManualInvestigationStart('inv-1', spaceA);

    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    expect(() =>
      syncManualInvestigationFreshFromSections(spaceA, [
        { id: 'critical', investigations: [{ id: 'inv-1' }] },
      ])
    ).not.toThrow();
    expect(getManualInvestigationFreshCounts(spaceA).critical).toBe(1);

    const listener = jest.fn();
    const unsubscribe = subscribeManualInvestigationFresh(listener);
    syncManualInvestigationFreshFromSections(spaceA, [
      { id: 'critical', investigations: [{ id: 'inv-1' }] },
    ]);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();

    setItem.mockRestore();
  });
});
