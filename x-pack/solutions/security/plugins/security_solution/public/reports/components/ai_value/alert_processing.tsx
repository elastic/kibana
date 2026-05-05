/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AlertProcessingKeyInsight } from './alert_processing_key_insight';
import { AlertsProcessingTable } from './alert_processing_table';
import { formatPercent, type ValueMetrics } from './metrics';
import * as i18n from './translations';
import { AlertProcessingDonut } from './alert_processing_donut_lens';

type Props =
  | { renderSample: true; valueMetrics: ValueMetrics }
  | {
      renderSample: false;
      valueMetrics: ValueMetrics;
      attackAlertIds: string[];
      from: string;
      to: string;
    };

export const AlertProcessing: React.FC<Props> = (props) => {
  const { valueMetrics, renderSample } = props;
  const {
    euiTheme: { size },
  } = useEuiTheme();
  const escalatedAlerts = useMemo(
    () => valueMetrics.totalAlerts - valueMetrics.filteredAlerts,
    [valueMetrics.filteredAlerts, valueMetrics.totalAlerts]
  );
  return (
    <div
      css={css`
        padding: ${size.base} ${size.xl};
      `}
    >
      <EuiTitle size="m">
        <h2>{i18n.ALERT_PROCESSING_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiFlexGroup
        gutterSize="xl"
        data-test-subj="alertProcessingGroup"
        css={css`
          gap: 48px;
        `}
      >
        <EuiFlexItem
          grow={false}
          css={css`
            min-width: 300px;
          `}
        >
          {renderSample ? (
            <AlertProcessingDonut renderSample={true} />
          ) : (
            <AlertProcessingDonut
              renderSample={false}
              attackAlertIds={props.attackAlertIds}
              from={props.from}
              to={props.to}
            />
          )}
          <AlertsProcessingTable
            filteredAlerts={valueMetrics.filteredAlerts}
            escalatedAlerts={escalatedAlerts}
            filteredAlertsPerc={formatPercent(valueMetrics.filteredAlertsPerc)}
            escalatedAlertsPerc={formatPercent(valueMetrics.escalatedAlertsPerc)}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <AlertProcessingKeyInsight valueMetrics={valueMetrics} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
    </div>
  );
};
