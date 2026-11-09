/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  dismissManualInvestigationFresh,
  getManualInvestigationFreshCounts,
  getManualInvestigationFreshCountsFromSections,
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

  it('scopes loaded-section counts for search without changing persisted state', () => {
    registerManualInvestigationStart('inv-1', spaceA);
    registerManualInvestigationStart('inv-2', spaceA);
    syncManualInvestigationFreshFromSections(spaceA, [
      { id: 'critical', investigations: [{ id: 'inv-1' }, { id: 'inv-2' }] },
    ]);

    expect(
      getManualInvestigationFreshCountsFromSections(spaceA, [
        { id: 'critical', investigations: [{ id: 'inv-2' }] },
      ])
    ).toEqual({ critical: 1, high: 0, medium: 0, low: 0 });
    expect(getManualInvestigationFreshCounts(spaceA).critical).toBe(2);
  });

  it('dismisses only from live finished state', () => {
    const finishedSections = [{ id: 'critical' as const, investigations: [{ id: 'inv-1' }] }];
    const runningSections = [{ id: 'in-progress' as const, investigations: [{ id: 'inv-1' }] }];

    expect(
      shouldDismissManualInvestigationFresh({
        investigationId: 'inv-1',
        sections: finishedSections,
      })
    ).toBe(true);
    // Finished in the live list wins over a stale by-id `in_progress: true`.
    expect(
      shouldDismissManualInvestigationFresh({
        investigationId: 'inv-1',
        sections: finishedSections,
        fetchedInProgress: true,
      })
    ).toBe(true);
    expect(
      shouldDismissManualInvestigationFresh({
        investigationId: 'inv-1',
        sections: runningSections,
        fetchedInProgress: false,
      })
    ).toBe(false);
    expect(
      shouldDismissManualInvestigationFresh({
        investigationId: 'inv-1',
        sections: [],
        fetchedInProgress: false,
      })
    ).toBe(true);
    expect(
      shouldDismissManualInvestigationFresh({
        investigationId: 'inv-1',
        sections: [],
        fetchedInProgress: true,
      })
    ).toBe(false);
    expect(
      shouldDismissManualInvestigationFresh({
        investigationId: 'inv-1',
        sections: [],
      })
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

  it('notifies subscribers on register and dismiss', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeManualInvestigationFresh(listener);

    registerManualInvestigationStart('inv-1', spaceA);
    dismissManualInvestigationFresh('inv-1', spaceA);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    registerManualInvestigationStart('inv-2', spaceA);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('migrates the legacy id-array storage shape', () => {
    window.localStorage.setItem(
      'nightshift.manualInvestigationFresh:/s/space-a',
      JSON.stringify(['legacy-1', 'legacy-2'])
    );

    expect(isManualInvestigationFresh('legacy-1', spaceA)).toBe(true);
    syncManualInvestigationFreshFromSections(spaceA, [
      { id: 'medium', investigations: [{ id: 'legacy-1' }] },
    ]);
    expect(getManualInvestigationFreshCounts(spaceA).medium).toBe(1);
  });

  it('keeps a session fallback when localStorage is fully unavailable', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => registerManualInvestigationStart('inv-quota', spaceA)).not.toThrow();
    expect(isManualInvestigationFresh('inv-quota', spaceA)).toBe(true);

    setItem.mockRestore();
    getItem.mockRestore();
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

  it('re-reads localStorage before each write so another tab is not overwritten', () => {
    registerManualInvestigationStart('inv-1', spaceA);
    window.localStorage.setItem(
      'nightshift.manualInvestigationFresh:/s/space-a',
      JSON.stringify([{ id: 'inv-1' }, { id: 'inv-2' }])
    );

    registerManualInvestigationStart('inv-3', spaceA);

    expect(isManualInvestigationFresh('inv-1', spaceA)).toBe(true);
    expect(isManualInvestigationFresh('inv-2', spaceA)).toBe(true);
    expect(isManualInvestigationFresh('inv-3', spaceA)).toBe(true);
  });
});
