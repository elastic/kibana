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

interface Props {
  valueMetrics: ValueMetrics;
  attackAlertIds: string[];
  isLoading: boolean;
  from: string;
  to: string;
}

export const AlertProcessing: React.FC<Props> = ({
  valueMetrics,
  isLoading,
  from,
  to,
  attackAlertIds,
}) => {
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
          <AlertProcessingDonut attackAlertIds={attackAlertIds} from={from} to={to} />
          <AlertsProcessingTable
            isLoading={isLoading}
            filteredAlerts={valueMetrics.filteredAlerts}
            escalatedAlerts={escalatedAlerts}
            filteredAlertsPerc={formatPercent(valueMetrics.filteredAlertsPerc)}
            escalatedAlertsPerc={formatPercent(valueMetrics.escalatedAlertsPerc)}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <AlertProcessingKeyInsight isLoading={isLoading} valueMetrics={valueMetrics} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
    </div>
  );
};
