/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiAccordion,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import {
  VolumeUsageTrendCard,
  CpuUsageTrendCard,
  MemoryUsageTrendCard,
} from '../cluster_overview_cards';

interface ClustersSectionProps {
  timeRange: TimeRange;
}

export const ClustersSection: React.FC<ClustersSectionProps> = ({ timeRange }) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(true);

  const buttonContent = (
    <EuiTitle size="xs">
      <h3>
        {i18n.translate('xpack.kubernetesPoc.kubernetesOverview.clustersSectionTitle', {
          defaultMessage: 'Clusters',
        })}
      </h3>
    </EuiTitle>
  );

  return (
    <EuiAccordion
      id="clusters-section"
      buttonContent={buttonContent}
      initialIsOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      paddingSize="none"
      arrowDisplay="left"
    >
      <EuiFlexGroup gutterSize="s" style={{ marginTop: euiTheme.size.s }}>
        <EuiFlexItem grow={1}>
          <EuiPanel hasBorder paddingSize="none">
            <CpuUsageTrendCard timeRange={timeRange} />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiPanel hasBorder paddingSize="none">
            <MemoryUsageTrendCard timeRange={timeRange} />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiPanel hasBorder paddingSize="none">
            <VolumeUsageTrendCard timeRange={timeRange} />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );
};
