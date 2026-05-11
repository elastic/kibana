/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ValueReportSettings } from './value_report_settings';
import { CostSavingsTrend } from './cost_savings_trend';
import { ExecutiveSummary } from './executive_summary';
import { AlertProcessing } from './alert_processing';
import type { ValueReportData } from '../../hooks/use_value_report_data';

type Props = Pick<
  ValueReportData,
  | 'isSample'
  | 'attackAlertIds'
  | 'analystHourlyRate'
  | 'minutesPerAlert'
  | 'from'
  | 'to'
  | 'valueMetrics'
  | 'valueMetricsCompare'
>;

export const AIValueReportLayout: React.FC<Props> = ({
  isSample,
  attackAlertIds,
  analystHourlyRate,
  minutesPerAlert,
  from,
  to,
  valueMetrics,
  valueMetricsCompare,
}) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  return (
    <div
      css={css`
        background: ${colors.backgroundBaseSubdued};
        width: 100%;
        min-height: 100%;
        border-radius: 8px;
      `}
    >
      <ExecutiveSummary
        attackAlertIds={attackAlertIds}
        analystHourlyRate={analystHourlyRate}
        isSample={isSample}
        minutesPerAlert={minutesPerAlert}
        from={from}
        to={to}
        valueMetrics={valueMetrics}
        valueMetricsCompare={valueMetricsCompare}
      />
      <div
        css={css`
          padding: 0 16px;
        `}
      >
        <EuiHorizontalRule />
      </div>
      <AlertProcessing
        isSample={isSample}
        attackAlertIds={attackAlertIds}
        valueMetrics={valueMetrics}
        from={from}
        to={to}
      />
      <div
        css={css`
          padding: 0 16px;
        `}
      >
        <EuiHorizontalRule />
      </div>
      <CostSavingsTrend
        isSample={isSample}
        analystHourlyRate={analystHourlyRate}
        minutesPerAlert={minutesPerAlert}
        from={from}
        to={to}
      />
      <div
        css={css`
          padding: 0 16px;
        `}
      >
        <EuiHorizontalRule />
      </div>
      <ValueReportSettings
        analystHourlyRate={analystHourlyRate}
        minutesPerAlert={minutesPerAlert}
      />
    </div>
  );
};
