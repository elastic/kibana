/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import type { RiskEngineMissingPrivilegesResponse } from '../../hooks/use_missing_risk_engine_privileges';
import type { useConfigurableRiskEngineSettings } from './hooks/risk_score_configurable_risk_engine_settings_hooks';
import { RiskScorePreviewSection } from './risk_score_preview_section';
import { RiskScoreUsefulLinksSection } from './risk_score_useful_links_section';
import { RiskScoreConfigurationSection } from './risk_score_configuration_section';
import { RiskScoreSaveBar } from './risk_score_save_bar';
import { RiskScoreGeneralSection } from './risk_score_general_section';
import { RunRiskEngineButton } from './run_risk_engine_button';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import * as i18n from '../../translations';

interface RiskScoreTabProps {
  riskEnginePrivileges: RiskEngineMissingPrivilegesResponse;
  riskEngineSettings: ReturnType<typeof useConfigurableRiskEngineSettings>;
}

export const RiskScoreTab: React.FC<RiskScoreTabProps> = ({
  riskEnginePrivileges,
  riskEngineSettings,
}) => {
  const {
    savedRiskEngineSettings,
    selectedRiskEngineSettings,
    selectedSettingsMatchSavedSettings,
    resetSelectedSettings,
    saveSelectedSettingsMutation,
    setSelectedDateSetting,
    toggleSelectedClosedAlertsSetting,
    isLoadingRiskEngineSettings,
    toggleScoreRetainment,
    setAlertFilters,
    getUIAlertFilters,
  } = riskEngineSettings;

  const riskScoreResetToZeroIsEnabled = useIsExperimentalFeatureEnabled(
    'enableRiskScoreResetToZero'
  );

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m" alignItems="center">
            <RunRiskEngineButton riskEnginePrivileges={riskEnginePrivileges} />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
        {!selectedRiskEngineSettings && (
          <EuiFlexItem>
            <EuiLoadingSpinner size="m" />
            <EuiText size="s">
              <p>{i18n.LOADING_RISK_ENGINE_SETTINGS}</p>
            </EuiText>
          </EuiFlexItem>
        )}
        {selectedRiskEngineSettings && (
          <>
            <EuiFlexItem grow={2}>
              {riskScoreResetToZeroIsEnabled && (
                <RiskScoreGeneralSection
                  riskEngineSettings={selectedRiskEngineSettings}
                  toggleScoreRetainment={toggleScoreRetainment}
                />
              )}
              <RiskScoreConfigurationSection
                selectedRiskEngineSettings={selectedRiskEngineSettings}
                setSelectedDateSetting={setSelectedDateSetting}
                toggleSelectedClosedAlertsSetting={toggleSelectedClosedAlertsSetting}
                onAlertFiltersChange={setAlertFilters}
                uiAlertFilters={getUIAlertFilters()}
              />
              <EuiHorizontalRule />
              <RiskScoreUsefulLinksSection />
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <RiskScorePreviewSection
                privileges={riskEnginePrivileges}
                includeClosedAlerts={selectedRiskEngineSettings.includeClosedAlerts}
                from={selectedRiskEngineSettings.range.start}
                to={selectedRiskEngineSettings.range.end}
                alertFilters={selectedRiskEngineSettings.filters}
              />
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
      {((savedRiskEngineSettings && !selectedSettingsMatchSavedSettings) ||
        (!savedRiskEngineSettings &&
          selectedRiskEngineSettings &&
          selectedRiskEngineSettings.filters &&
          selectedRiskEngineSettings.filters.length > 0)) && (
        <RiskScoreSaveBar
          resetSelectedSettings={resetSelectedSettings}
          saveSelectedSettings={() => {
            if (selectedRiskEngineSettings) {
              saveSelectedSettingsMutation.mutateAsync(selectedRiskEngineSettings);
            }
          }}
          isLoading={isLoadingRiskEngineSettings || saveSelectedSettingsMutation.isLoading}
        />
      )}
    </>
  );
};
