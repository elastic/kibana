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
  EuiHealth,
  useEuiTheme,
  EuiSkeletonText,
} from '@elastic/eui';
import * as i18n from './translations';

interface Props {
  filteredAlerts: number;
  escalatedAlerts: number;
  isLoading: boolean;
  filteredAlertsPerc: string;
  escalatedAlertsPerc: string;
}

export const AlertsProcessingTable: React.FC<Props> = ({
  filteredAlerts,
  escalatedAlerts,
  isLoading,
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
      <EuiFlexItem grow={false} data-test-subj="alertsProcessingTableFilteredAlerts">
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiHealth color={colors.vis.euiColorVis0} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <p>{i18n.AI_FILTERED}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={isLoading}>
            {isLoading ? (
              <EuiSkeletonText lines={1} size="xs" isLoading={true} />
            ) : (
              <EuiText size="s">
                <strong>{`${filteredAlerts} (${filteredAlertsPerc})`}</strong>
              </EuiText>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false} data-test-subj="alertsProcessingTableEscalatedAlerts">
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiHealth color={colors.vis.euiColorVis9} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <p>{i18n.ESCALATED}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={isLoading}>
            {isLoading ? (
              <EuiSkeletonText lines={1} size="xs" isLoading={true} />
            ) : (
              <EuiText size="s">
                <strong>{`${escalatedAlerts} (${escalatedAlertsPerc})`}</strong>
              </EuiText>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
