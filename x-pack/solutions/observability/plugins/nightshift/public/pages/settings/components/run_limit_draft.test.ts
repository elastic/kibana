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
  setInvestigationLimitsEnabled,
  setRunLimitEnabled,
} from './run_limit_draft';

const response = {
  enabled: false,
  limits: {
    detection: 15,
    investigation: 5,
    manual_investigation: 5,
    total_investigation: 10,
    ki_extraction: 3,
  },
};

describe('run quota drafts', () => {
  it('normalizes legacy globally disabled settings while retaining finite restore limits', () => {
    expect(createRunQuotaDraftState({ enabled: false })).toEqual({
      saved: {
        enabled: false,
        investigationLimitsEnabled: true,
        limits: {
          detection: 0,
          investigation: 5,
          manual_investigation: 5,
          total_investigation: 10,
          ki_extraction: 0,
        },
      },
      draft: {
        enabled: false,
        investigationLimitsEnabled: true,
        limits: {
          detection: 0,
          investigation: 5,
          manual_investigation: 5,
          total_investigation: 10,
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
    expect(unlimited.draft.restoreLimits.investigation).toBe(5);

    const limited = setRunLimitEnabled(unlimited, 'investigation', true);
    expect(limited.draft.limits.investigation).toBe(5);
  });

  it('builds a partial update with only settings changed by the user', () => {
    const state = createRunQuotaDraftState({ ...response, enabled: true });
    state.draft.limits.investigation = 0;
    state.draft.limits.manual_investigation = 0;
    state.draft.limits.total_investigation = 8;

    expect(buildRunQuotaSettingsUpdate(state)).toEqual({
      limits: { investigation: null, manual_investigation: null, total_investigation: 8 },
    });
  });

  it('changes the investigation limit without touching the global enabled flag', () => {
    let state = setRunLimitEnabled(createRunQuotaDraftState(response), 'investigation', false);

    expect(state.draft.enabled).toBe(false);
    expect(buildRunQuotaSettingsUpdate(state)).toEqual({ limits: { investigation: null } });

    state = setRunLimitEnabled(state, 'investigation', true);
    state.draft.limits.investigation = 7;

    expect(state.draft.enabled).toBe(false);
    expect(buildRunQuotaSettingsUpdate(state)).toEqual({ limits: { investigation: 7 } });
  });

  it('builds an atomic activation for legacy globally disabled settings', () => {
    const state = setRunLimitEnabled(createRunQuotaDraftState(response), 'detection', true);

    expect(buildRunQuotaSettingsUpdate(state)).toEqual({
      activateLimits: { detection: 15 },
    });
  });

  it('keeps an investigation edit made in the same save as a legacy activation', () => {
    let state = setRunLimitEnabled(createRunQuotaDraftState(response), 'detection', true);
    state.draft.limits.investigation = 4;
    state.draft.limits.total_investigation = 8;

    expect(buildRunQuotaSettingsUpdate(state)).toEqual({
      activateLimits: { detection: 15 },
      limits: { investigation: 4, total_investigation: 8 },
    });

    state = setRunLimitEnabled(state, 'investigation', false);

    expect(buildRunQuotaSettingsUpdate(state)).toEqual({
      activateLimits: { detection: 15 },
      limits: { investigation: null, total_investigation: 8 },
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

  it('turns the investigation limits off without clearing their values', () => {
    const state = setInvestigationLimitsEnabled(
      createRunQuotaDraftState({ ...response, enabled: true }),
      false
    );

    expect(state.draft.limits).toEqual(response.limits);
    expect(buildRunQuotaSettingsUpdate(state)).toEqual({ investigationLimitsEnabled: false });
  });

  it('restores the remembered limits when the investigation limits are turned on with none set', () => {
    const state = createRunQuotaDraftState({
      enabled: true,
      investigationLimitsEnabled: false,
      limits: {
        ...response.limits,
        investigation: 0,
        manual_investigation: 0,
        total_investigation: 0,
      },
    });

    const enabled = setInvestigationLimitsEnabled(state, true);

    expect(enabled.draft.limits).toMatchObject({
      investigation: 5,
      manual_investigation: 5,
      total_investigation: 10,
    });
    expect(buildRunQuotaSettingsUpdate(enabled)).toEqual({
      investigationLimitsEnabled: true,
      limits: { investigation: 5, manual_investigation: 5, total_investigation: 10 },
    });
  });

  it('does not build an update for unchanged or invalid drafts', () => {
    expect(buildRunQuotaSettingsUpdate(createRunQuotaDraftState(response))).toBeUndefined();

    const state = createRunQuotaDraftState(response);
    state.draft.limits.detection = '';
    expect(buildRunQuotaSettingsUpdate(state)).toBeUndefined();
  });
});
