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
  EuiText,
  EuiTitle,
  EuiHealth,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import * as i18n from './translations';
import { formatThousands } from './metrics';

interface Props {
  totalAlerts: number;
  filteredAlerts: number;
  escalatedAlerts: number;
  filteredAlertsPerc: string;
  escalatedAlertsPerc: string;
}

export const AlertsProcessingTable: React.FC<Props> = ({
  totalAlerts,
  filteredAlerts,
  escalatedAlerts,
  filteredAlertsPerc,
  escalatedAlertsPerc,
}) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      style={{ maxWidth: 280 }}
      data-test-subj="alertsProcessingTable"
    >
      <EuiFlexItem>
        <EuiText size="s" color="subdued">
          <p>{i18n.TOTAL_ALERTS_PROCESSED}</p>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem data-test-subj="alertsProcessingTableTotalAlerts">
        <EuiTitle size="m">
          <h2>{formatThousands(totalAlerts)}</h2>
        </EuiTitle>
      </EuiFlexItem>

      <EuiSpacer size="s" />

      <EuiFlexItem data-test-subj="alertsProcessingTableFilteredAlerts">
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiHealth color={colors.vis.euiColorVis0} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <p>{i18n.AI_FILTERED}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{`${filteredAlerts} (${filteredAlertsPerc})`}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem data-test-subj="alertsProcessingTableEscalatedAlerts">
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiHealth color={colors.vis.euiColorVis9} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <p>{i18n.ESCALATED}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{`${escalatedAlerts} (${escalatedAlertsPerc})`}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
