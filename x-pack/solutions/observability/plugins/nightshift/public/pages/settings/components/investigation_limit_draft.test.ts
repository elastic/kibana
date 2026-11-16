/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildInvestigationQuotaUpdate,
  createInvestigationQuotaDraftState,
  hasInvestigationQuotaDraftChanges,
  isInvestigationQuotaDraftValid,
  isLowerFiniteLimit,
  isValidFiniteInvestigationLimit,
  keepRestoreLimits,
  parseInvestigationLimitDraft,
  setInvestigationQuotaEnabled,
  MAX_RUN_LIMIT,
  type InvestigationLimitDraft,
  type InvestigationQuotaDraftState,
} from './investigation_limit_draft';

const stateOf = (
  limits: {
    automatic_investigation?: number | null;
    manual_investigation?: number | null;
    total_investigation?: number | null;
  } = {},
  enabled = true
) =>
  createInvestigationQuotaDraftState({
    enabled,
    limits: {
      automatic_investigation: 4,
      manual_investigation: 6,
      total_investigation: 9,
      ...limits,
    },
  });

const withDraftLimit = (
  state: InvestigationQuotaDraftState,
  limits: Partial<InvestigationQuotaDraftState['draft']['limits']>
): InvestigationQuotaDraftState => ({
  ...state,
  draft: { ...state.draft, limits: { ...state.draft.limits, ...limits } },
});

describe('createInvestigationQuotaDraftState', () => {
  it('shows an unlimited limit as an empty input and remembers a finite value to restore for it', () => {
    const { draft, saved } = stateOf({ manual_investigation: null });

    expect(saved.limits.manual_investigation).toBeNull();
    expect(draft.limits).toEqual({
      automatic_investigation: 4,
      manual_investigation: '',
      total_investigation: 9,
    });
    expect(draft.restoreLimits).toEqual({
      automatic_investigation: 4,
      manual_investigation: 5,
      total_investigation: 9,
    });
  });
});

describe('keepRestoreLimits', () => {
  it('keeps the previous value to restore for a limit that is now unlimited', () => {
    const previous = stateOf();

    const next = keepRestoreLimits(stateOf({ automatic_investigation: null }), previous);

    expect(next.draft.restoreLimits.automatic_investigation).toBe(4);
  });

  it('takes the new value for a limit that is still finite', () => {
    const next = keepRestoreLimits(stateOf({ automatic_investigation: 8 }), stateOf());

    expect(next.draft.restoreLimits.automatic_investigation).toBe(8);
  });

  it('returns the state as is without a previous one', () => {
    const next = stateOf();

    expect(keepRestoreLimits(next)).toBe(next);
  });
});

describe('hasInvestigationQuotaDraftChanges', () => {
  it('has no changes for a draft equal to the saved settings', () => {
    expect(hasInvestigationQuotaDraftChanges(stateOf({ manual_investigation: null }))).toBe(false);
  });

  it('reads an emptied input as unlimited, so emptying an unlimited input is no change', () => {
    const state = stateOf({ manual_investigation: null });

    expect(
      hasInvestigationQuotaDraftChanges(
        withDraftLimit(withDraftLimit(state, { manual_investigation: 3 }), {
          manual_investigation: '',
        })
      )
    ).toBe(false);
  });

  it('has changes when a limit or the switch changes', () => {
    expect(
      hasInvestigationQuotaDraftChanges(withDraftLimit(stateOf(), { automatic_investigation: 5 }))
    ).toBe(true);
    expect(hasInvestigationQuotaDraftChanges(setInvestigationQuotaEnabled(stateOf(), false))).toBe(
      true
    );
  });
});

describe('isInvestigationQuotaDraftValid', () => {
  const cases: Array<[InvestigationLimitDraft, boolean]> = [
    [1, true],
    [MAX_RUN_LIMIT, true],
    ['', true],
    [0, false],
    [1.5, false],
    [MAX_RUN_LIMIT + 1, false],
    [-3, false],
    [Number.NaN, false],
  ];

  it.each(cases)('limit %s -> valid: %s', (limit, valid) => {
    expect(
      isInvestigationQuotaDraftValid(withDraftLimit(stateOf(), { manual_investigation: limit }))
    ).toBe(valid);
  });
});

describe('setInvestigationQuotaEnabled', () => {
  it('keeps the limits when turned off and on', () => {
    const off = setInvestigationQuotaEnabled(stateOf(), false);
    const on = setInvestigationQuotaEnabled(off, true);

    expect(off.draft.limits).toEqual(stateOf().draft.limits);
    expect(on.draft.limits).toEqual(stateOf().draft.limits);
  });

  it('keeps an unlimited limit unlimited when others are finite', () => {
    const state = stateOf({ manual_investigation: null });

    const on = setInvestigationQuotaEnabled(setInvestigationQuotaEnabled(state, false), true);

    expect(on.draft.limits.manual_investigation).toBe('');
  });

  it('brings back the remembered limits when turned on while every limit is unlimited', () => {
    const saved = stateOf();
    const unlimited = keepRestoreLimits(
      stateOf({
        automatic_investigation: null,
        manual_investigation: null,
        total_investigation: null,
      }),
      saved
    );

    const on = setInvestigationQuotaEnabled(setInvestigationQuotaEnabled(unlimited, false), true);

    expect(on.draft.limits).toEqual({
      automatic_investigation: 4,
      manual_investigation: 6,
      total_investigation: 9,
    });
  });
});

describe('buildInvestigationQuotaUpdate', () => {
  it('sends nothing without changes', () => {
    expect(buildInvestigationQuotaUpdate(stateOf())).toBeUndefined();
  });

  it('sends only what changed, with null for a limit removed', () => {
    const state = withDraftLimit(stateOf(), {
      automatic_investigation: 7,
      manual_investigation: '',
    });

    expect(buildInvestigationQuotaUpdate(state)).toEqual({
      limits: { automatic_investigation: 7, manual_investigation: null },
    });
  });

  it('sends the switch alone when only it changed', () => {
    expect(buildInvestigationQuotaUpdate(setInvestigationQuotaEnabled(stateOf(), false))).toEqual({
      enabled: false,
    });
  });

  it('sends nothing while a limit is invalid', () => {
    expect(
      buildInvestigationQuotaUpdate(withDraftLimit(stateOf(), { manual_investigation: 1.5 }))
    ).toBeUndefined();
  });
});

describe('isLowerFiniteLimit', () => {
  const cases: Array<[number | null, InvestigationLimitDraft, boolean]> = [
    [10, 5, true],
    [10, 10, false],
    [10, 11, false],
    [null, 5, true],
    [10, '', false],
    [10, 0, false],
    [null, 0, false],
  ];

  it.each(cases)('%s -> %s is lower: %s', (previous, next, expected) => {
    expect(isLowerFiniteLimit(previous, next)).toBe(expected);
  });
});

describe('input helpers', () => {
  it('parses an empty input as unlimited and others as numbers', () => {
    expect(parseInvestigationLimitDraft('')).toBe('');
    expect(parseInvestigationLimitDraft('12')).toBe(12);
  });

  it('accepts whole numbers from 1 to the maximum', () => {
    expect(isValidFiniteInvestigationLimit(1)).toBe(true);
    expect(isValidFiniteInvestigationLimit(0)).toBe(false);
    expect(isValidFiniteInvestigationLimit(null)).toBe(false);
  });
});
