/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRiskEngineSettingsQuery } from './use_risk_engine_settings_query';
import { useRiskEngineSettingsMutations } from './use_risk_engine_settings_mutations';
import { useRiskEngineSettingsState } from './use_risk_engine_settings_state';

export const useConfigurableRiskEngineSettings = () => {
  const { savedRiskEngineSettings, isLoadingRiskEngineSettings, isError } =
    useRiskEngineSettingsQuery();

  const {
    selectedRiskEngineSettings,
    selectedSettingsMatchSavedSettings,
    resetSelectedSettings,
    setSelectedDateSetting,
    toggleSelectedClosedAlertsSetting,
    toggleScoreRetainment,
    setAlertFilters,
    getUIAlertFilters,
    waitingForSaveRefetch,
    preSaveFilterCount,
  } = useRiskEngineSettingsState(savedRiskEngineSettings, isLoadingRiskEngineSettings, isError);

  const { saveSelectedSettingsMutation } = useRiskEngineSettingsMutations(
    savedRiskEngineSettings,
    waitingForSaveRefetch,
    preSaveFilterCount
  );

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

// Re-export the individual hooks for direct use if needed
export { useRiskEngineSettingsQuery } from './use_risk_engine_settings_query';
export { useRiskEngineSettingsMutations } from './use_risk_engine_settings_mutations';
export { useRiskEngineSettingsState } from './use_risk_engine_settings_state';
export { useInvalidateRiskEngineSettingsQuery } from './use_risk_engine_settings_query';
export type { RiskScoreConfiguration } from '../common';
