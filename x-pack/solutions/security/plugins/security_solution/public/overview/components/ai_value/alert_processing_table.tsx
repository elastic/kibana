/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle, EuiHealth, EuiSpacer } from '@elastic/eui';
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
  return (
    <div style={{ maxWidth: 280 }}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            <p>{i18n.TOTAL_ALERTS_PROCESSED}</p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiTitle size="m">
            <h2>{formatThousands(totalAlerts)}</h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiSpacer size="s" />

        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiHealth color="#00BFB3" />
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

        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiHealth color="#FEC514" />
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
    </div>
  );
};
