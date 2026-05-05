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
import type { ValueMetrics } from './metrics';
import {
  SAMPLE_FROM,
  SAMPLE_TO,
  SAMPLE_VALUE_METRICS,
  SAMPLE_VALUE_METRICS_COMPARE,
  SAMPLE_ANALYST_HOURLY_RATE,
  SAMPLE_MINUTES_PER_ALERT,
} from './sample_data';

type Props =
  | { renderSample: true }
  | {
      renderSample: false;
      attackAlertIds: string[];
      analystHourlyRate: number;
      minutesPerAlert: number;
      from: string;
      to: string;
      valueMetrics: ValueMetrics;
      valueMetricsCompare: ValueMetrics;
    };

export const AIValueReportLayout: React.FC<Props> = (props) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();
  const { renderSample } = props;

  // TODO: Consider moving the logic for determining what data to use (sample vs live) into a higher level component
  const {
    attackAlertIds,
    analystHourlyRate,
    minutesPerAlert,
    from,
    to,
    valueMetrics,
    valueMetricsCompare,
  } = renderSample
    ? {
        attackAlertIds: [],
        analystHourlyRate: SAMPLE_ANALYST_HOURLY_RATE,
        minutesPerAlert: SAMPLE_MINUTES_PER_ALERT,
        from: SAMPLE_FROM,
        to: SAMPLE_TO,
        valueMetrics: SAMPLE_VALUE_METRICS,
        valueMetricsCompare: SAMPLE_VALUE_METRICS_COMPARE,
      }
    : props;

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
        renderSample={renderSample}
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
      <>
        <AlertProcessing
          renderSample={renderSample}
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
      </>
      <CostSavingsTrend
        renderSample={renderSample}
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
