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
  EuiLoadingSpinner,
  EuiSwitch,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import * as i18n from '../../translations';
import { getEntityAnalyticsRiskScorePageStyles } from './risk_score_page_styles';
import type { RiskScoreConfigurationState } from './hooks/risk_score_configurable_risk_engine_settings_hooks';

export const RiskScoreConfigurationSection = ({
  selectedRiskEngineSettings,
  setSelectedDateSetting,
  toggleSelectedClosedAlertsSetting,
}: {
  selectedRiskEngineSettings: RiskScoreConfigurationState | undefined;
  setSelectedDateSetting: ({ start, end }: { start: string; end: string }) => void;
  toggleSelectedClosedAlertsSetting: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const styles = getEntityAnalyticsRiskScorePageStyles(euiTheme);

  if (!selectedRiskEngineSettings) return <EuiLoadingSpinner size="m" />;
  return (
    <>
      <EuiFlexGroup alignItems="center">
        <div>
          <EuiSwitch
            label={i18n.INCLUDE_CLOSED_ALERTS_LABEL}
            checked={selectedRiskEngineSettings.includeClosedAlerts}
            onChange={toggleSelectedClosedAlertsSetting}
            data-test-subj="includeClosedAlertsSwitch"
          />
        </div>
        <styles.VerticalSeparator />
        <div>
          <EuiSuperDatePicker
            start={selectedRiskEngineSettings.range.start}
            end={selectedRiskEngineSettings.range.end}
            onTimeChange={setSelectedDateSetting}
            width="auto"
            compressed={false}
            showUpdateButton={false}
          />
        </div>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiText size="s">
        <p>{i18n.RISK_ENGINE_INCLUDE_CLOSED_ALERTS_DESCRIPTION}</p>
      </EuiText>
    </>
  );
};
