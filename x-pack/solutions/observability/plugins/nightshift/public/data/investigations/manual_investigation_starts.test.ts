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
  rememberManualInvestigationSeverity,
  resetManualInvestigationFreshForTests,
  subscribeManualInvestigationFresh,
} from './manual_investigation_starts';

describe('manualInvestigationStarts', () => {
  const spaceA = '/s/space-a';
  const spaceB = '/s/space-b';

  beforeEach(() => {
    window.localStorage.clear();
    resetManualInvestigationFreshForTests();
  });

  it('registers, remembers severity for tile counts, and dismisses per space', () => {
    registerManualInvestigationStart('inv-1', spaceA);
    registerManualInvestigationStart('inv-2', spaceA);
    registerManualInvestigationStart('inv-1', spaceB);

    expect(isManualInvestigationFresh('inv-1', spaceA)).toBe(true);
    expect(isManualInvestigationFresh('inv-2', spaceA)).toBe(true);
    expect(isManualInvestigationFresh('inv-2', spaceB)).toBe(false);

    rememberManualInvestigationSeverity('inv-1', 'critical', spaceA);
    rememberManualInvestigationSeverity('inv-2', 'high', spaceA);

    expect(getManualInvestigationFreshCounts(spaceA)).toEqual({
      critical: 1,
      high: 1,
      medium: 0,
      low: 0,
    });
    expect(getManualInvestigationFreshCounts(spaceB)).toEqual({
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    });

    dismissManualInvestigationFresh('inv-1', spaceA);
    expect(isManualInvestigationFresh('inv-1', spaceA)).toBe(false);
    expect(isManualInvestigationFresh('inv-1', spaceB)).toBe(true);
    expect(getManualInvestigationFreshCounts(spaceA)).toEqual({
      critical: 0,
      high: 1,
      medium: 0,
      low: 0,
    });
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
    rememberManualInvestigationSeverity('legacy-1', 'medium', spaceA);
    expect(getManualInvestigationFreshCounts(spaceA).medium).toBe(1);
  });

  it('keeps the session mirror when localStorage.setItem throws', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    expect(() => registerManualInvestigationStart('inv-quota', spaceA)).not.toThrow();
    expect(isManualInvestigationFresh('inv-quota', spaceA)).toBe(true);

    setItem.mockRestore();
  });
});
