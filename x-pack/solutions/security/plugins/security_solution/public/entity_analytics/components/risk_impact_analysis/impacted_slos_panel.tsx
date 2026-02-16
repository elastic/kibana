/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiBasicTable,
  EuiBadge,
  EuiHealth,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ImpactedSLO } from '../../../../common/entity_analytics/risk_impact/types';

interface ImpactedSLOsPanelProps {
  slos: ImpactedSLO[];
}

const getStatusColor = (status: ImpactedSLO['status']) => {
  switch (status) {
    case 'VIOLATED':
      return 'danger';
    case 'DEGRADED':
      return 'warning';
    case 'HEALTHY':
      return 'success';
    default:
      return 'subdued';
  }
};

const getCriticalityColor = (criticality: ImpactedSLO['criticality']) => {
  switch (criticality) {
    case 'Critical':
      return 'danger';
    case 'High':
      return 'warning';
    case 'Medium':
      return 'primary';
    default:
      return 'default';
  }
};

export const ImpactedSLOsPanel: React.FC<ImpactedSLOsPanelProps> = ({ slos }) => {
  const columns: Array<EuiBasicTableColumn<ImpactedSLO>> = [
    {
      field: 'name',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.riskImpact.sloName"
          defaultMessage="SLO Name"
        />
      ),
      width: '30%',
    },
    {
      field: 'status',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.riskImpact.status"
          defaultMessage="Status"
        />
      ),
      render: (status: ImpactedSLO['status']) => (
        <EuiHealth color={getStatusColor(status)}>{status}</EuiHealth>
      ),
      width: '10%',
    },
    {
      field: 'criticality',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.riskImpact.criticality"
          defaultMessage="Criticality"
        />
      ),
      render: (criticality: ImpactedSLO['criticality']) => (
        <EuiBadge color={getCriticalityColor(criticality)}>{criticality}</EuiBadge>
      ),
      width: '10%',
    },
    {
      field: 'currentBurnRate',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.riskImpact.currentBurnRate"
          defaultMessage="Current Burn Rate"
        />
      ),
      render: (rate: number) => (
        <EuiText size="s">{rate != null ? `${rate.toFixed(1)}x` : 'N/A'}</EuiText>
      ),
      width: '15%',
    },
    {
      field: 'projectedBurnRate',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.riskImpact.projectedBurnRate"
          defaultMessage="Projected Burn Rate"
        />
      ),
      render: (rate: number) => (
        <EuiText size="s" color="danger">
          <strong>{rate != null ? `${rate.toFixed(1)}x` : 'N/A'}</strong>
        </EuiText>
      ),
      width: '15%',
    },
    {
      field: 'timeToBreach',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.riskImpact.timeToBreach"
          defaultMessage="Time to Breach"
        />
      ),
      render: (time?: string) => (
        <EuiText size="s" color="danger">
          {time || 'N/A'}
        </EuiText>
      ),
      width: '20%',
    },
  ];

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiTitle size="m">
        <h2>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.riskImpact.impactedSLOs"
            defaultMessage="Impacted SLOs ({count})"
            values={{ count: slos.length }}
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      {slos.length > 0 ? (
        <EuiBasicTable<ImpactedSLO> items={slos} columns={columns} />
      ) : (
        <EuiText color="subdued">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.riskImpact.noImpactedSLOs"
            defaultMessage="No impacted SLOs detected"
          />
        </EuiText>
      )}
    </EuiPanel>
  );
};
