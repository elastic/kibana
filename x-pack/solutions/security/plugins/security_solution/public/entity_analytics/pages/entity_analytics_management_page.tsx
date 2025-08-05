/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiHorizontalRule,
  EuiButton,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import moment from 'moment';
import { RiskScorePreviewSection } from '../components/risk_score_management/risk_score_preview_section';
import { RiskScoreEnableSection } from '../components/risk_score_management/risk_score_enable_section';
import { ENTITY_ANALYTICS_RISK_SCORE } from '../../app/translations';
import { RiskEnginePrivilegesCallOut } from '../components/risk_engine_privileges_callout';
import { useMissingRiskEnginePrivileges } from '../hooks/use_missing_risk_engine_privileges';
import { RiskScoreUsefulLinksSection } from '../components/risk_score_management/risk_score_useful_links_section';
import { RiskScoreConfigurationSection } from '../components/risk_score_management/risk_score_configuration_section';
import { useRiskEngineStatus } from '../api/hooks/use_risk_engine_status';
import { useScheduleNowRiskEngineMutation } from '../api/hooks/use_schedule_now_risk_engine_mutation';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import * as i18n from '../translations';
import { getEntityAnalyticsRiskScorePageStyles } from '../components/risk_score_management/risk_score_page_styles';
import { useConfigurableRiskEngineSettings } from '../components/risk_score_management/hooks/risk_score_configurable_risk_engine_settings_hooks';
import { RiskScoreSaveBar } from '../components/risk_score_management/risk_score_save_bar';

const TEN_SECONDS = 10000;

export const EntityAnalyticsManagementPage = () => {
  const { euiTheme } = useEuiTheme();
  const styles = getEntityAnalyticsRiskScorePageStyles(euiTheme);
  const privileges = useMissingRiskEnginePrivileges();
  const {
    savedRiskEngineSettings,
    selectedRiskEngineSettings,
    selectedSettingsMatchSavedSettings,
    resetSelectedSettings,
    saveSelectedSettingsMutation,
    setSelectedDateSetting,
    toggleSelectedClosedAlertsSetting,
    isLoadingRiskEngineSettings,
  } = useConfigurableRiskEngineSettings();
  const { data: riskEngineStatus } = useRiskEngineStatus({
    refetchInterval: TEN_SECONDS,
    structuralSharing: false, // Force the component to rerender after every Risk Engine Status API call
  });
  const currentRiskEngineStatus = riskEngineStatus?.risk_engine_status;
  const runEngineEnabled = currentRiskEngineStatus === 'ENABLED';
  const [isLoadingRunRiskEngine, setIsLoadingRunRiskEngine] = useState(false);
  const { mutate: scheduleNowRiskEngine } = useScheduleNowRiskEngineMutation();
  const { addSuccess, addError } = useAppToasts();

  const handleRunEngineClick = async () => {
    setIsLoadingRunRiskEngine(true);
    try {
      scheduleNowRiskEngine();
      if (!isLoadingRunRiskEngine) {
        addSuccess(i18n.RISK_SCORE_ENGINE_RUN_SUCCESS, { toastLifeTimeMs: 5000 });
      }
    } catch (error) {
      addError(error, {
        title: i18n.RISK_SCORE_ENGINE_RUN_FAILURE,
      });
    } finally {
      setIsLoadingRunRiskEngine(false);
    }
  };

  const { status, runAt } = riskEngineStatus?.risk_engine_task_status || {};

  const isRunning = status === 'running' || (!!runAt && new Date(runAt) < new Date());

  const formatTimeFromNow = (time: string | undefined): string => {
    if (!time) {
      return '';
    }
    return i18n.RISK_ENGINE_NEXT_RUN_TIME(moment(time).fromNow(true));
  };

  const countDownText = isRunning
    ? 'Now running'
    : formatTimeFromNow(riskEngineStatus?.risk_engine_task_status?.runAt);

  return (
    <>
      <RiskEnginePrivilegesCallOut privileges={privileges} />
      <EuiPageHeader
        pageTitle={
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            {/* Page Title */}
            <EuiFlexItem data-test-subj="entityAnalyticsManagementPageTitle" grow={false}>
              {ENTITY_ANALYTICS_RISK_SCORE}
            </EuiFlexItem>

            {/* Controls Section */}
            <EuiFlexItem grow={false}>
              <EuiFlexGroup justifyContent={'center'} alignItems="center" gutterSize="m">
                {runEngineEnabled && (
                  <>
                    <EuiButton
                      size="s"
                      iconType="play"
                      isLoading={isLoadingRunRiskEngine}
                      onClick={handleRunEngineClick}
                    >
                      {i18n.RUN_RISK_SCORE_ENGINE}
                    </EuiButton>
                    <styles.VerticalSeparator />
                    <div>
                      <EuiText size="s" color="subdued">
                        {countDownText}
                      </EuiText>
                    </div>
                  </>
                )}
                <RiskScoreEnableSection
                  selectedSettingsMatchSavedSettings={selectedSettingsMatchSavedSettings}
                  saveSelectedSettingsMutation={saveSelectedSettingsMutation}
                  privileges={privileges}
                />
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />

      <EuiHorizontalRule />
      <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
        {!selectedRiskEngineSettings && <EuiLoadingSpinner size="m" />}
        {selectedRiskEngineSettings && (
          <>
            <EuiFlexItem grow={2}>
              <RiskScoreConfigurationSection
                selectedRiskEngineSettings={selectedRiskEngineSettings}
                setSelectedDateSetting={setSelectedDateSetting}
                toggleSelectedClosedAlertsSetting={toggleSelectedClosedAlertsSetting}
              />
              <EuiHorizontalRule />
              <RiskScoreUsefulLinksSection />
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <RiskScorePreviewSection
                privileges={privileges}
                includeClosedAlerts={selectedRiskEngineSettings.includeClosedAlerts}
                from={selectedRiskEngineSettings.range.start}
                to={selectedRiskEngineSettings.range.end}
              />
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
      {savedRiskEngineSettings && !selectedSettingsMatchSavedSettings && (
        <RiskScoreSaveBar
          resetSelectedSettings={resetSelectedSettings}
          saveSelectedSettings={saveSelectedSettingsMutation.mutateAsync}
          isLoading={isLoadingRiskEngineSettings || saveSelectedSettingsMutation.isLoading}
        />
      )}
    </>
  );
};

EntityAnalyticsManagementPage.displayName = 'EntityAnalyticsManagementPage';
