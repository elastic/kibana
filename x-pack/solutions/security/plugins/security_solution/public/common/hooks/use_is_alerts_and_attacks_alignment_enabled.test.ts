/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useIsAlertsAndAttacksAlignmentEnabled } from './use_is_alerts_and_attacks_alignment_enabled';
import { useKibana } from '../lib/kibana';
import { useIsExperimentalFeatureEnabled } from './use_experimental_features';
import { ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING } from '../../../common/constants';

vi.mock('../lib/kibana', () => {
  const mocked = {
    useKibana: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./use_experimental_features', () => {
  const mocked = {
    useIsExperimentalFeatureEnabled: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('useIsAlertsAndAttacksAlignmentEnabled', () => {
  let mockUiSettingsGet: Mock;

  beforeEach(() => {
    mockUiSettingsGet = vi.fn();
    (useKibana as Mock).mockReturnValue({
      services: {
        uiSettings: {
          get: mockUiSettingsGet,
        },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when uiSettings returns true', () => {
    (useIsExperimentalFeatureEnabled as Mock).mockReturnValue(false);
    mockUiSettingsGet.mockReturnValue(true);

    const { result } = renderHook(() => useIsAlertsAndAttacksAlignmentEnabled());

    expect(useIsExperimentalFeatureEnabled).toHaveBeenCalledWith('enableAlertsAndAttacksAlignment');
    expect(mockUiSettingsGet).toHaveBeenCalledWith(
      ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING,
      false
    );
    expect(result.current).toBe(true);
  });

  it('should return false when uiSettings returns false', () => {
    (useIsExperimentalFeatureEnabled as Mock).mockReturnValue(true);
    mockUiSettingsGet.mockReturnValue(false);

    const { result } = renderHook(() => useIsAlertsAndAttacksAlignmentEnabled());

    expect(useIsExperimentalFeatureEnabled).toHaveBeenCalledWith('enableAlertsAndAttacksAlignment');
    expect(mockUiSettingsGet).toHaveBeenCalledWith(
      ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING,
      true
    );
    expect(result.current).toBe(false);
  });

  it('should return the fallback value from experimental feature when uiSettings returns the default', () => {
    (useIsExperimentalFeatureEnabled as Mock).mockReturnValue(true);
    mockUiSettingsGet.mockImplementation((key, defaultValue) => defaultValue);

    const { result } = renderHook(() => useIsAlertsAndAttacksAlignmentEnabled());

    expect(useIsExperimentalFeatureEnabled).toHaveBeenCalledWith('enableAlertsAndAttacksAlignment');
    expect(mockUiSettingsGet).toHaveBeenCalledWith(
      ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING,
      true
    );
    expect(result.current).toBe(true);
  });
});
