/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexGrid } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DockerCharts } from '../../../charts/docker_charts';
import { DOCKER_METRIC_TYPES, INTEGRATIONS, KUBERNETES_METRIC_TYPES } from '../../../constants';
import { useIntegrationCheck } from '../../../hooks/use_integration_check';
import { KubernetesContainerCharts } from '../../../charts/kubernetes_charts';
import { useTabSwitcherContext } from '../../../hooks/use_tab_switcher';
import { ContentTabIds } from '../../../types';

interface Props {
  assetId: string;
  dateRange: TimeRange;
  dataView?: DataView;
}

export const ContainerMetrics = (props: Props) => {
  const { showTab } = useTabSwitcherContext();
  const isDockerContainer = useIntegrationCheck({ dependsOn: INTEGRATIONS.docker });
  const isKubernetesContainer = useIntegrationCheck({
    dependsOn: INTEGRATIONS.kubernetesContainer,
  });

  const onClick = (metric: string) => {
    showTab(ContentTabIds.METRICS, { scrollTo: metric });
  };

  if (!isDockerContainer && !isKubernetesContainer) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="m" direction="column">
      <EuiFlexGrid columns={2} gutterSize="s">
        {isDockerContainer &&
          DOCKER_METRIC_TYPES.map((metric) => (
            <DockerCharts key={metric} {...props} metric={metric} onShowAll={onClick} />
          ))}
        {!isDockerContainer &&
          isKubernetesContainer &&
          KUBERNETES_METRIC_TYPES.map((metric) => (
            <KubernetesContainerCharts
              key={metric}
              {...props}
              metric={metric}
              onShowAll={onClick}
            />
          ))}
      </EuiFlexGrid>
    </EuiFlexGroup>
  );
};
