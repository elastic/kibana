/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { useConfigureSORiskEngineMutation } from '../../../api/hooks/use_configure_risk_engine_saved_object';
import * as i18n from '../../../translations';
import {
  DEFAULT_ENTITY_TYPES,
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

// Transformation utilities

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

const riskEngineSettingsWithDefaults = (
  riskEngineSettings?: Partial<RiskScoreConfiguration>
): RiskScoreConfiguration => ({
  includeClosedAlerts: riskEngineSettings?.includeClosedAlerts ?? false,
  range: {
    start: riskEngineSettings?.range?.start ?? 'now-30d',
    end: riskEngineSettings?.range?.end ?? 'now',
  },
  enableResetToZero:
    riskEngineSettings?.enableResetToZero === undefined
      ? true
      : riskEngineSettings.enableResetToZero,
  filters: riskEngineSettings?.filters ?? [],
});

const FETCH_RISK_ENGINE_SETTINGS = ['GET', 'FETCH_RISK_ENGINE_SETTINGS'];

export const useInvalidateRiskEngineSettingsQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await queryClient.invalidateQueries(FETCH_RISK_ENGINE_SETTINGS, {
      refetchType: 'active',
    });
  }, [queryClient]);
};

export const useConfigurableRiskEngineSettings = () => {
  const { addSuccess } = useAppToasts();

  const { fetchRiskEngineSettings } = useEntityAnalyticsRoutes();

  const [selectedRiskEngineSettings, setSelectedRiskEngineSettings] = useState<
    RiskScoreConfiguration | undefined
  >(undefined);

  const invalidateRiskEngineSettingsQuery = useInvalidateRiskEngineSettingsQuery();

  const {
    data: savedRiskEngineSettings,
    isLoading: isLoadingRiskEngineSettings,
    isError,
  } = useQuery(
    FETCH_RISK_ENGINE_SETTINGS,
    async () => {
      const riskEngineSettings = await fetchRiskEngineSettings();

      // Transform filters from backend format to internal format for storage
      const backendFilters = (riskEngineSettings as Record<string, unknown>)?.filters;
      const transformedSettings = riskEngineSettings
        ? {
            ...riskEngineSettings,
            filters: Array.isArray(backendFilters) ? backendFilters : [],
          }
        : undefined;

      setSelectedRiskEngineSettings((currentValue) => {
        return currentValue ?? riskEngineSettingsWithDefaults(transformedSettings);
      });
      return transformedSettings;
    },
    { retry: false, refetchOnWindowFocus: false }
  );

  useEffect(() => {
    // An error case, where we set the selection to default values, is a legitimate and expected part of this flow, particularly when a configuration has never been saved.
    if (isError) {
      setSelectedRiskEngineSettings(riskEngineSettingsWithDefaults());
    }
  }, [isError]);

  // Track when we're waiting for a save to complete and refetch
  const waitingForSaveRefetch = useRef(false);
  const preSaveFilterCount = useRef<number>(0);

  // Sync selected settings after a successful save and refetch completes
  useEffect(() => {
    const currentFilterCount = savedRiskEngineSettings?.filters?.length || 0;

    if (
      waitingForSaveRefetch.current &&
      !isLoadingRiskEngineSettings &&
      savedRiskEngineSettings &&
      currentFilterCount !== preSaveFilterCount.current
    ) {
      const savedWithDefaults = riskEngineSettingsWithDefaults(savedRiskEngineSettings);
      setSelectedRiskEngineSettings(savedWithDefaults);
      waitingForSaveRefetch.current = false;
      preSaveFilterCount.current = 0;
    }
  }, [savedRiskEngineSettings, isLoadingRiskEngineSettings, selectedRiskEngineSettings]);

  const resetSelectedSettings = () => {
    setSelectedRiskEngineSettings(riskEngineSettingsWithDefaults(savedRiskEngineSettings));
  };

  const { mutateAsync: mutateRiskEngineSettingsAsync } = useConfigureSORiskEngineMutation();

  const saveSelectedSettingsMutation = useMutation(async () => {
    if (selectedRiskEngineSettings) {
      await mutateRiskEngineSettingsAsync(selectedRiskEngineSettings, {
        onSuccess: () => {
          addSuccess(i18n.RISK_ENGINE_SAVED_OBJECT_CONFIGURATION_SUCCESS, {
            toastLifeTimeMs: 5000,
          });
        },
      });

      // Track pre-save state to detect when refetch completes
      preSaveFilterCount.current = savedRiskEngineSettings?.filters?.length || 0;
      waitingForSaveRefetch.current = true;

      // Trigger refetch
      await invalidateRiskEngineSettingsQuery();
    }
  });

  const setSelectedDateSetting = ({ start, end }: { start: string; end: string }) => {
    setSelectedRiskEngineSettings((prevState) => {
      if (!prevState) return undefined;
      return { ...prevState, ...{ range: { start, end } } };
    });
  };

  const toggleSelectedClosedAlertsSetting = () => {
    setSelectedRiskEngineSettings((prevState) => {
      if (!prevState) return undefined;
      return { ...prevState, ...{ includeClosedAlerts: !prevState.includeClosedAlerts } };
    });
  };

  const selectedSettingsMatchSavedSettings = settingsAreEqual(
    selectedRiskEngineSettings,
    riskEngineSettingsWithDefaults(savedRiskEngineSettings)
  );

  const toggleScoreRetainment = () => {
    setSelectedRiskEngineSettings((prevState) => {
      if (!prevState) return undefined;
      return { ...prevState, ...{ enableResetToZero: !prevState.enableResetToZero } };
    });
  };

  const setAlertFilters = (filters: UIAlertFilter[]) => {
    const transformedFilters = transformFiltersForBackend(filters);
    setSelectedRiskEngineSettings((prevState) => {
      if (!prevState) {
        return riskEngineSettingsWithDefaults({ filters: transformedFilters });
      }
      return { ...prevState, filters: transformedFilters };
    });
  };

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

  return {
    savedRiskEngineSettings,
    selectedRiskEngineSettings,
    selectedSettingsMatchSavedSettings,
    resetSelectedSettings,
    setSelectedDateSetting,
    toggleSelectedClosedAlertsSetting,
    saveSelectedSettingsMutation,
    isLoadingRiskEngineSettings,
    toggleScoreRetainment,
    setAlertFilters,
    getUIAlertFilters,
  };
};
