/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiSuperDatePicker,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSwitch,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import * as i18n from '../../translations';
import { getEntityAnalyticsRiskScorePageStyles } from './risk_score_page_styles';
import type { RiskScoreConfiguration } from './hooks/risk_score_configurable_risk_engine_settings_hooks';

export const RiskScoreConfigurationSection = ({
  selectedRiskEngineSettings,
  setSelectedDateSetting,
  toggleSelectedClosedAlertsSetting,
}: {
  selectedRiskEngineSettings: RiskScoreConfiguration | undefined;
  setSelectedDateSetting: ({ start, end }: { start: string; end: string }) => void;
  toggleSelectedClosedAlertsSetting: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const styles = getEntityAnalyticsRiskScorePageStyles(euiTheme);

  if (!selectedRiskEngineSettings) return <EuiLoadingSpinner size="m" />;
  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiSwitch
          label={i18n.INCLUDE_CLOSED_ALERTS_LABEL}
          checked={selectedRiskEngineSettings.includeClosedAlerts}
          onChange={toggleSelectedClosedAlertsSetting}
          data-test-subj="includeClosedAlertsSwitch"
        />
        <styles.VerticalSeparator />
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            start={selectedRiskEngineSettings.range.start}
            end={selectedRiskEngineSettings.range.end}
            onTimeChange={setSelectedDateSetting}
            width="auto"
            compressed={false}
            showUpdateButton={false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiText size="s">
        <p>{i18n.RISK_ENGINE_INCLUDE_CLOSED_ALERTS_DESCRIPTION}</p>
      </EuiText>
    </>
  );
};
