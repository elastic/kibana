/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useIsNewFlyoutEnabled } from './use_is_new_flyout_enabled';
import { useKibana } from '../lib/kibana';
import { useIsExperimentalFeatureEnabled } from './use_experimental_features';
import { ENABLE_NEW_FLYOUT_SETTING } from '../../../common/constants';

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

describe('useIsNewFlyoutEnabled', () => {
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

  it('returns true when the flag is off and the user opted in via the advanced setting', () => {
    (useIsExperimentalFeatureEnabled as Mock).mockReturnValue(false);
    mockUiSettingsGet.mockReturnValue(true);

    const { result } = renderHook(() => useIsNewFlyoutEnabled());

    expect(useIsExperimentalFeatureEnabled).toHaveBeenCalledWith('newFlyoutSystemDisabled');
    expect(mockUiSettingsGet).toHaveBeenCalledWith(ENABLE_NEW_FLYOUT_SETTING, true);
    expect(result.current).toBe(true);
  });

  it('returns false when the flag is off and the advanced setting is explicitly off', () => {
    (useIsExperimentalFeatureEnabled as Mock).mockReturnValue(false);
    mockUiSettingsGet.mockReturnValue(false);

    const { result } = renderHook(() => useIsNewFlyoutEnabled());

    expect(useIsExperimentalFeatureEnabled).toHaveBeenCalledWith('newFlyoutSystemDisabled');
    expect(mockUiSettingsGet).toHaveBeenCalledWith(ENABLE_NEW_FLYOUT_SETTING, true);
    expect(result.current).toBe(false);
  });

  it('returns false when the flag is on, ignoring any value stored for the advanced setting', () => {
    (useIsExperimentalFeatureEnabled as Mock).mockReturnValue(true);
    // Even if a stale `true` is still stored for the setting, the feature flag wins.
    mockUiSettingsGet.mockReturnValue(true);

    const { result } = renderHook(() => useIsNewFlyoutEnabled());

    expect(useIsExperimentalFeatureEnabled).toHaveBeenCalledWith('newFlyoutSystemDisabled');
    expect(mockUiSettingsGet).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });
});
