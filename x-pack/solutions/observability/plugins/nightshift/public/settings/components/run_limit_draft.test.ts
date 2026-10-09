/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildRunQuotaSettingsUpdate,
  createRunQuotaDraftState,
  isValidLimitedRunLimitDraft,
  isValidRunLimitDraft,
  parseRunLimitDraft,
  setRunLimitEnabled,
} from './run_limit_draft';

const response = {
  enabled: false,
  limits: {
    detection: 15,
    investigation: 3,
    ki_extraction: 3,
  },
};

describe('run quota drafts', () => {
  it('normalizes legacy globally disabled settings while retaining finite restore limits', () => {
    expect(createRunQuotaDraftState({ enabled: false })).toEqual({
      saved: {
        enabled: false,
        limits: {
          detection: 0,
          investigation: 0,
          ki_extraction: 0,
        },
      },
      draft: {
        enabled: false,
        limits: {
          detection: 0,
          investigation: 0,
          ki_extraction: 0,
        },
        restoreLimits: response.limits,
      },
    });
  });

  it('treats zero as unlimited but not as a valid limited value', () => {
    expect(parseRunLimitDraft('0')).toBe(0);
    expect(isValidRunLimitDraft(0)).toBe(true);
    expect(isValidLimitedRunLimitDraft(0)).toBe(false);
    expect(isValidRunLimitDraft(10_000)).toBe(true);
    expect(isValidRunLimitDraft('')).toBe(false);
    expect(isValidRunLimitDraft(1.5)).toBe(false);
    expect(isValidRunLimitDraft(-1)).toBe(false);
    expect(isValidRunLimitDraft(10_001)).toBe(false);
  });

  it('restores the previous finite limit after a category limit is re-enabled', () => {
    const state = createRunQuotaDraftState({ ...response, enabled: true });
    const unlimited = setRunLimitEnabled(state, 'investigation', false);

    expect(unlimited.draft.limits.investigation).toBe(0);
    expect(unlimited.draft.restoreLimits.investigation).toBe(3);

    const limited = setRunLimitEnabled(unlimited, 'investigation', true);
    expect(limited.draft.limits.investigation).toBe(3);
  });

  it('builds a partial update with only settings changed by the user', () => {
    const state = createRunQuotaDraftState({ ...response, enabled: true });
    state.draft.limits.investigation = 0;

    expect(buildRunQuotaSettingsUpdate(state)).toEqual({
      limits: { investigation: 0 },
    });
  });

  it('builds an atomic activation for legacy globally disabled settings', () => {
    const state = setRunLimitEnabled(createRunQuotaDraftState(response), 'detection', true);

    expect(buildRunQuotaSettingsUpdate(state)).toEqual({
      activateLimits: { detection: 15 },
    });
  });

  it('activates legacy enforcement after a cleared limit is repaired', () => {
    let state = createRunQuotaDraftState(response);
    state = setRunLimitEnabled(state, 'detection', true);
    state = setRunLimitEnabled(state, 'ki_extraction', true);
    state.draft.limits.detection = '';
    state = setRunLimitEnabled(state, 'ki_extraction', false);
    state.draft.limits.detection = 20;

    expect(state.draft.enabled).toBe(false);
    expect(buildRunQuotaSettingsUpdate(state)).toEqual({
      activateLimits: { detection: 20 },
    });
  });

  it('does not build an update for unchanged or invalid drafts', () => {
    expect(buildRunQuotaSettingsUpdate(createRunQuotaDraftState(response))).toBeUndefined();

    const state = createRunQuotaDraftState(response);
    state.draft.limits.detection = '';
    expect(buildRunQuotaSettingsUpdate(state)).toBeUndefined();
  });
});
