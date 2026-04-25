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
  EuiLoadingSpinner,
  EuiSwitch,
  EuiSpacer,
  EuiTitle,
  EuiFormRow,
  EuiIconTip,
} from '@elastic/eui';
import * as i18n from '../../translations';
import { AlertFiltersKqlBar } from './alert_filters_kql_bar';
import type { RiskScoreConfiguration, UIAlertFilter } from './common';

export const RiskScoreConfigurationSection = ({
  selectedRiskEngineSettings,
  setSelectedDateSetting,
  toggleSelectedClosedAlertsSetting,
  onAlertFiltersChange,
  uiAlertFilters,
}: {
  selectedRiskEngineSettings: RiskScoreConfiguration | undefined;
  setSelectedDateSetting: ({ start, end }: { start: string; end: string }) => void;
  toggleSelectedClosedAlertsSetting: () => void;
  onAlertFiltersChange?: (filters: UIAlertFilter[]) => void;
  uiAlertFilters: UIAlertFilter[];
}) => {
  if (!selectedRiskEngineSettings) {
    return (
      <>
        <EuiTitle>
          <h4>{i18n.RISK_SCORE_ALERT_CONFIG}</h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiLoadingSpinner size="m" />
        <EuiText size="s">
          <p>{i18n.LOADING_RISK_ENGINE_SETTINGS}</p>
        </EuiText>
      </>
    );
  }
  return (
    <>
      <EuiTitle>
        <h4>{i18n.RISK_SCORE_ALERT_CONFIG}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiFormRow label={i18n.ALERT_TIME_WINDOW_LABEL} display="rowCompressed">
        <EuiSuperDatePicker
          start={selectedRiskEngineSettings.range.start}
          end={selectedRiskEngineSettings.range.end}
          onTimeChange={setSelectedDateSetting}
          width="auto"
          compressed={true}
          showUpdateButton={false}
        />
      </EuiFormRow>

      <EuiSpacer size="xl" />

      <EuiFormRow
        label={
          <span>
            {i18n.CLOSED_ALERTS_TEXT}{' '}
            <EuiIconTip
              type="info"
              content={i18n.RISK_ENGINE_INCLUDE_CLOSED_ALERTS_DESCRIPTION}
              position="right"
            />
          </span>
        }
        display="rowCompressed"
      >
        <EuiSwitch
          label={i18n.INCLUDE_CLOSED_ALERTS_LABEL}
          checked={selectedRiskEngineSettings.includeClosedAlerts}
          onChange={toggleSelectedClosedAlertsSetting}
          data-test-subj="includeClosedAlertsSwitch"
        />
      </EuiFormRow>

      <EuiSpacer size="xl" />

      <AlertFiltersKqlBar
        placeholder={i18n.ALERT_FILTERS_PLACEHOLDER}
        compressed={true}
        data-test-subj="alertFiltersKqlBar"
        onFiltersChange={onAlertFiltersChange}
        filters={uiAlertFilters}
      />

      <EuiSpacer size="m" />
    </>
  );
};
