/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useRiskEngineSettingsState } from './use_risk_engine_settings_state';
import type { RiskScoreConfiguration, UIAlertFilter } from '../common';

describe('useRiskEngineSettingsState', () => {
  const mockSavedSettings: RiskScoreConfiguration = {
    includeClosedAlerts: true,
    range: { start: 'now-7d', end: 'now' },
    enableResetToZero: false,
    filters: [
      {
        entity_types: ['user', 'host'],
        filter: 'host.name: "test-host"',
      },
    ],
  };

  it('should initialize with default values when no saved settings', () => {
    const { result } = renderHook(() => useRiskEngineSettingsState(undefined, false, false));

    expect(result.current.selectedRiskEngineSettings).toBeUndefined();
    expect(result.current.selectedSettingsMatchSavedSettings).toBe(false);
  });

  it('should initialize with saved settings when provided', () => {
    const { result } = renderHook(() =>
      useRiskEngineSettingsState(mockSavedSettings, false, false)
    );

    expect(result.current.selectedRiskEngineSettings).toEqual(mockSavedSettings);
    expect(result.current.selectedSettingsMatchSavedSettings).toBe(true);
  });

  it('should handle error case by setting default values', () => {
    const { result } = renderHook(() => useRiskEngineSettingsState(undefined, false, true));

    expect(result.current.selectedRiskEngineSettings).toEqual({
      includeClosedAlerts: false,
      range: { start: 'now-30d', end: 'now' },
      enableResetToZero: true,
      filters: [],
    });
  });

  it('should update date settings correctly', () => {
    const { result } = renderHook(() =>
      useRiskEngineSettingsState(mockSavedSettings, false, false)
    );

    act(() => {
      result.current.setSelectedDateSetting({ start: 'now-14d', end: 'now-1d' });
    });

    expect(result.current.selectedRiskEngineSettings?.range).toEqual({
      start: 'now-14d',
      end: 'now-1d',
    });
  });

  it('should toggle closed alerts setting', () => {
    const { result } = renderHook(() =>
      useRiskEngineSettingsState(mockSavedSettings, false, false)
    );

    const initialValue = result.current.selectedRiskEngineSettings?.includeClosedAlerts;

    act(() => {
      result.current.toggleSelectedClosedAlertsSetting();
    });

    expect(result.current.selectedRiskEngineSettings?.includeClosedAlerts).toBe(!initialValue);
  });

  it('should toggle score retainment setting', () => {
    const { result } = renderHook(() =>
      useRiskEngineSettingsState(mockSavedSettings, false, false)
    );

    const initialValue = result.current.selectedRiskEngineSettings?.enableResetToZero;

    act(() => {
      result.current.toggleScoreRetainment();
    });

    expect(result.current.selectedRiskEngineSettings?.enableResetToZero).toBe(!initialValue);
  });

  it('should set alert filters correctly', () => {
    const { result } = renderHook(() =>
      useRiskEngineSettingsState(mockSavedSettings, false, false)
    );

    const newFilters: UIAlertFilter[] = [
      {
        id: 'filter-1',
        text: 'user.name: "new-user"',
        entityTypes: ['user'],
      },
    ];

    act(() => {
      result.current.setAlertFilters(newFilters);
    });

    expect(result.current.selectedRiskEngineSettings?.filters).toEqual([
      {
        entity_types: ['user'],
        filter: 'user.name: "new-user"',
      },
    ]);
  });

  it('should get UI alert filters correctly', () => {
    const { result } = renderHook(() =>
      useRiskEngineSettingsState(mockSavedSettings, false, false)
    );

    const uiFilters = result.current.getUIAlertFilters();

    expect(uiFilters).toEqual([
      {
        id: expect.stringMatching(/^filter-0-\d+$/),
        text: 'host.name: "test-host"',
        entityTypes: ['user', 'host'],
      },
    ]);
  });

  it('should reset settings to saved values', () => {
    const { result } = renderHook(() =>
      useRiskEngineSettingsState(mockSavedSettings, false, false)
    );

    // Modify settings
    act(() => {
      result.current.toggleSelectedClosedAlertsSetting();
    });

    expect(result.current.selectedSettingsMatchSavedSettings).toBe(false);

    // Reset settings
    act(() => {
      result.current.resetSelectedSettings();
    });

    expect(result.current.selectedRiskEngineSettings).toEqual(mockSavedSettings);
    expect(result.current.selectedSettingsMatchSavedSettings).toBe(true);
  });

  it('should detect when settings match saved settings', () => {
    const { result } = renderHook(() =>
      useRiskEngineSettingsState(mockSavedSettings, false, false)
    );

    expect(result.current.selectedSettingsMatchSavedSettings).toBe(true);

    act(() => {
      result.current.toggleSelectedClosedAlertsSetting();
    });

    expect(result.current.selectedSettingsMatchSavedSettings).toBe(false);
  });

  it('should handle empty filters array', () => {
    const settingsWithEmptyFilters: RiskScoreConfiguration = {
      ...mockSavedSettings,
      filters: [],
    };

    const { result } = renderHook(() =>
      useRiskEngineSettingsState(settingsWithEmptyFilters, false, false)
    );

    const uiFilters = result.current.getUIAlertFilters();
    expect(uiFilters).toEqual([]);
  });

  it('should handle undefined filters', () => {
    const settingsWithUndefinedFilters: RiskScoreConfiguration = {
      includeClosedAlerts: true,
      range: { start: 'now-7d', end: 'now' },
      enableResetToZero: false,
      filters: undefined as unknown as RiskScoreConfiguration['filters'],
    };

    const { result } = renderHook(() =>
      useRiskEngineSettingsState(settingsWithUndefinedFilters, false, false)
    );

    const uiFilters = result.current.getUIAlertFilters();
    expect(uiFilters).toEqual([]);
  });
});
