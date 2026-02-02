/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_ENTITY_TYPES,
  getRiskScoreConfigurationWithDefaults,
  type AlertFilter,
  type RiskScoreConfiguration,
  type UIAlertFilter,
} from '../common';

const transformFiltersForBackend = (uiFilters: UIAlertFilter[]): AlertFilter[] => {
  return uiFilters.map((f) => ({
    entity_types: f.entityTypes ?? DEFAULT_ENTITY_TYPES,
    filter: f.text,
  }));
};

const settingsAreEqual = (
  first?: Partial<RiskScoreConfiguration>,
  second?: Partial<RiskScoreConfiguration>
) => {
  const normalizeFilters = (filters?: AlertFilter[]) => {
    if (!filters || filters.length === 0) return [];
    return filters
      .map((f) => ({
        entity_types: [...(f.entity_types || [])].sort(),
        filter: (f.filter || '').trim(),
      }))
      .sort((a, b) => {
        const filterCompare = a.filter.localeCompare(b.filter);
        if (filterCompare !== 0) return filterCompare;
        return JSON.stringify(a.entity_types).localeCompare(JSON.stringify(b.entity_types));
      });
  };

  const firstFilters = normalizeFilters(first?.filters);
  const secondFilters = normalizeFilters(second?.filters);
  const alertFiltersEqual = JSON.stringify(firstFilters) === JSON.stringify(secondFilters);

  return (
    first?.includeClosedAlerts === second?.includeClosedAlerts &&
    first?.range?.start === second?.range?.start &&
    first?.range?.end === second?.range?.end &&
    first?.enableResetToZero === second?.enableResetToZero &&
    alertFiltersEqual
  );
};

export const useRiskEngineSettingsState = (
  savedRiskEngineSettings?: RiskScoreConfiguration,
  isLoadingRiskEngineSettings?: boolean,
  isError?: boolean
) => {
  const [selectedRiskEngineSettings, setSelectedRiskEngineSettings] = useState<
    RiskScoreConfiguration | undefined
  >(undefined);

  // Track when we're waiting for a save to complete and refetch
  const waitingForSaveRefetch = useRef(false);
  const preSaveFilterCount = useRef<number>(0);

  // Initialize selected settings when saved settings are loaded
  useEffect(() => {
    if (savedRiskEngineSettings && !selectedRiskEngineSettings) {
      setSelectedRiskEngineSettings(getRiskScoreConfigurationWithDefaults(savedRiskEngineSettings));
    }
  }, [savedRiskEngineSettings, selectedRiskEngineSettings]);

  // Handle error case by setting default values
  useEffect(() => {
    if (isError) {
      setSelectedRiskEngineSettings(getRiskScoreConfigurationWithDefaults());
    }
  }, [isError]);

  // Sync selected settings after a successful save and refetch completes
  useEffect(() => {
    const currentFilterCount = savedRiskEngineSettings?.filters?.length || 0;

    if (
      waitingForSaveRefetch.current &&
      !isLoadingRiskEngineSettings &&
      savedRiskEngineSettings &&
      currentFilterCount !== preSaveFilterCount.current
    ) {
      const savedWithDefaults = getRiskScoreConfigurationWithDefaults(savedRiskEngineSettings);
      setSelectedRiskEngineSettings(savedWithDefaults);
      waitingForSaveRefetch.current = false;
      preSaveFilterCount.current = 0;
    }
  }, [savedRiskEngineSettings, isLoadingRiskEngineSettings, selectedRiskEngineSettings]);

  const resetSelectedSettings = useCallback(() => {
    setSelectedRiskEngineSettings(getRiskScoreConfigurationWithDefaults(savedRiskEngineSettings));
  }, [savedRiskEngineSettings]);

  const setSelectedDateSetting = useCallback(({ start, end }: { start: string; end: string }) => {
    setSelectedRiskEngineSettings((prevState) => {
      if (!prevState) return undefined;
      return { ...prevState, range: { start, end } };
    });
  }, []);

  const toggleSelectedClosedAlertsSetting = useCallback(() => {
    setSelectedRiskEngineSettings((prevState) => {
      if (!prevState) return undefined;
      return { ...prevState, includeClosedAlerts: !prevState.includeClosedAlerts };
    });
  }, []);

  const toggleScoreRetainment = useCallback(() => {
    setSelectedRiskEngineSettings((prevState) => {
      if (!prevState) return undefined;
      return { ...prevState, enableResetToZero: !prevState.enableResetToZero };
    });
  }, []);

  const setAlertFilters = useCallback((filters: UIAlertFilter[]) => {
    const transformedFilters = transformFiltersForBackend(filters);
    setSelectedRiskEngineSettings((prevState) => {
      if (!prevState) {
        return getRiskScoreConfigurationWithDefaults({ filters: transformedFilters });
      }
      return { ...prevState, filters: transformedFilters };
    });
  }, []);

  // Getter for UI-formatted filters - memoized to prevent unnecessary transformations
  const getUIAlertFilters = useCallback((): UIAlertFilter[] => {
    return (
      selectedRiskEngineSettings?.filters?.map((f, idx) => ({
        id: `filter-${idx}-${Date.now()}`,
        text: f.filter,
        entityTypes: f.entity_types,
      })) || []
    );
  }, [selectedRiskEngineSettings]);

  const selectedSettingsMatchSavedSettings = settingsAreEqual(
    selectedRiskEngineSettings,
    getRiskScoreConfigurationWithDefaults(savedRiskEngineSettings)
  );

  return {
    selectedRiskEngineSettings,
    selectedSettingsMatchSavedSettings,
    resetSelectedSettings,
    setSelectedDateSetting,
    toggleSelectedClosedAlertsSetting,
    toggleScoreRetainment,
    setAlertFilters,
    getUIAlertFilters,
    // Expose refs for mutation hook to use
    waitingForSaveRefetch,
    preSaveFilterCount,
  };
};
