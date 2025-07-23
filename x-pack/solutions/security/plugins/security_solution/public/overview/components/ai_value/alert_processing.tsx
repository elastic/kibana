/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { ComparePercentage } from './compare_percentage';
import { formatPercent } from './metrics';
import * as i18n from './translations';
import { AlertProcessingDonut } from './alert_processing_donut';

interface Props {
  attackAlertIds: string[];
  attackAlertsCountPerc: number;
  attackAlertsCountPercCompare: number;
  from: string;
  to: string;
  filteredAlertsPerc: number;
  filteredAlertsPercCompare: number;
}

export const AlertProcessing: React.FC<Props> = ({
  attackAlertIds,
  attackAlertsCountPerc,
  attackAlertsCountPercCompare,
  filteredAlertsPerc,
  filteredAlertsPercCompare,
  from,
  to,
}) => {
  return (
    <EuiPanel paddingSize="l">
      <EuiTitle size="s">
        <h3>{i18n.ALERT_PROCESSING_TITLE}</h3>
      </EuiTitle>
      <EuiText size="s">
        <p>{i18n.ALERT_PROCESSING_DESC}</p>
      </EuiText>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <p>{'Compared to the previous period'}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ComparePercentage
            currentCount={filteredAlertsPerc}
            previousCount={filteredAlertsPercCompare}
            stat={formatPercent(filteredAlertsPercCompare)}
            statType={i18n.FILTERING_RATE}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <p>{'False positives'}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ComparePercentage
            currentCount={attackAlertsCountPerc}
            previousCount={attackAlertsCountPercCompare}
            stat={formatPercent(attackAlertsCountPercCompare)}
            statType={i18n.ESCALATED_RATE}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <p>{'Escalated alerts'}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <AlertProcessingDonut attackAlertIds={attackAlertIds} from={from} to={to} />
    </EuiPanel>
  );
};
