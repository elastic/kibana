/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useIsAlertsAndAttacksAlignmentEnabled } from './use_is_alerts_and_attacks_alignment_enabled';
import { useKibana } from '../lib/kibana';
import { useIsExperimentalFeatureEnabled } from './use_experimental_features';
import { ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING } from '../../../common/constants';

jest.mock('../lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('./use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

describe('useIsAlertsAndAttacksAlignmentEnabled', () => {
  let mockUiSettingsGet: jest.Mock;

  beforeEach(() => {
    mockUiSettingsGet = jest.fn();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        uiSettings: {
          get: mockUiSettingsGet,
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when uiSettings returns true', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
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
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
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
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
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
