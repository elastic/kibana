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
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiStat,
  EuiToolTip,
} from '@elastic/eui';

import type { DetonationKpis as DetonationKpisModel } from '../../../common/detonate';
import {
  KPI_DETECTION_ALERTS,
  KPI_DETONATIONS,
  KPI_ENDPOINT_ALERTS,
  KPI_FAMILIES,
  KPI_FAMILIES_TOOLTIP,
} from '../translations';

interface KpiCardProps {
  title: number;
  description: string;
  tooltip?: string;
  isLoading: boolean;
  color?: 'primary' | 'accent' | 'success' | 'danger';
}

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  description,
  tooltip,
  isLoading,
  color = 'primary',
}) => (
  <EuiFlexItem>
    <EuiPanel hasBorder paddingSize="m">
      {isLoading ? (
        <EuiLoadingSpinner size="l" />
      ) : (
        <EuiStat
          title={title.toLocaleString()}
          description={
            tooltip ? (
              <EuiToolTip content={tooltip}>
                <span tabIndex={0}>
                  {description} <EuiIcon type="question" size="s" aria-hidden={true} />
                </span>
              </EuiToolTip>
            ) : (
              description
            )
          }
          titleColor={color}
          titleSize="l"
          textAlign="left"
        />
      )}
    </EuiPanel>
  </EuiFlexItem>
);

interface DetonationKpisProps {
  kpis: DetonationKpisModel;
  isLoading: boolean;
}

const DetonationKpisComponent: React.FC<DetonationKpisProps> = ({ kpis, isLoading }) => (
  <EuiFlexGroup gutterSize="m" data-test-subj="detonateKpis">
    <KpiCard title={kpis.totalDetonations} description={KPI_DETONATIONS} isLoading={isLoading} />
    <KpiCard
      title={kpis.namedFamilies}
      description={KPI_FAMILIES}
      tooltip={KPI_FAMILIES_TOOLTIP}
      isLoading={isLoading}
      color="accent"
    />
    <KpiCard
      title={kpis.endpointAlerts}
      description={KPI_ENDPOINT_ALERTS}
      isLoading={isLoading}
      color="danger"
    />
    <KpiCard
      title={kpis.detectionAlerts}
      description={KPI_DETECTION_ALERTS}
      isLoading={isLoading}
      color="danger"
    />
  </EuiFlexGroup>
);

export const DetonationKpis = React.memo(DetonationKpisComponent);
