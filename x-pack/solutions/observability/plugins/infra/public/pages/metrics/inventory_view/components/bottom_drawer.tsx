/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiPanel } from '@elastic/eui';
import styled from '@emotion/styled';
import { useUiTracker } from '@kbn/observability-shared-plugin/public';
import type { DataSchemaFormat, InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { useWaffleOptionsContext } from '../hooks/use_waffle_options';
import type { InfraFormatter } from '../../../../common/inventory/types';
import { Timeline } from './timeline/timeline';
import { useTimeRangeMetadataContext } from '../../../../hooks/use_time_range_metadata';
import { KubernetesButton } from '../../../../components/kubernetes_dashboard_promotion/ecs_kubernetes_dashboard_promotion';
import { OtelKubernetesButton } from '../../../../components/kubernetes_dashboard_promotion/otel_kubernetes_dashboard_promotion';
import { useInstalledIntegration } from '../../../../hooks/use_installed_integration';

const showHistory = i18n.translate('xpack.infra.showHistory', {
  defaultMessage: 'Show history',
});
const hideHistory = i18n.translate('xpack.infra.hideHistory', {
  defaultMessage: 'Hide history',
});

interface Props {
  interval: string;
  formatter: InfraFormatter;
  view: string;
  nodeType: InventoryItemType;
}

export const BottomDrawer = ({ interval, formatter, view, nodeType }: Props) => {
  const { timelineOpen, changeTimelineOpen } = useWaffleOptionsContext();
  const { data: timeRangeMetadata } = useTimeRangeMetadataContext();
  const [isOpen, setIsOpen] = useState(Boolean(timelineOpen));
  const schemas: DataSchemaFormat[] = useMemo(
    () => timeRangeMetadata?.schemas || [],
    [timeRangeMetadata?.schemas]
  );

  const hasElasticSchema = schemas.includes('ecs');
  const { isInstalled: hasEcsK8sIntegration } = useInstalledIntegration('kubernetes');
  const hasSemconvSchema = schemas.includes('semconv');
  const { isInstalled: hasOtelK8sIntegration } = useInstalledIntegration('kubernetes_otel');

  const showEcsK8sButton = hasElasticSchema && hasEcsK8sIntegration;
  const showOtelK8sButton = hasSemconvSchema && hasOtelK8sIntegration;

  useEffect(() => {
    if (isOpen !== timelineOpen) setIsOpen(Boolean(timelineOpen));
  }, [isOpen, timelineOpen]);

  const trackDrawerOpen = useUiTracker({ app: 'infra_metrics' });
  const onClick = useCallback(() => {
    if (!isOpen) trackDrawerOpen({ metric: 'open_timeline_drawer__inventory' });
    setIsOpen(!isOpen);
    changeTimelineOpen(!isOpen);
  }, [isOpen, trackDrawerOpen, changeTimelineOpen]);

  if (view === 'table') {
    return nodeType === 'pod' && (showEcsK8sButton || showOtelK8sButton) ? (
      <BottomPanel hasBorder={false} hasShadow={false} borderRadius="none" paddingSize="s">
        <EuiFlexGroup responsive={false} justifyContent="flexStart" alignItems="center">
          {showEcsK8sButton && (
            <EuiFlexItem grow={false}>
              <KubernetesButton />
            </EuiFlexItem>
          )}
          {showOtelK8sButton && (
            <EuiFlexItem grow={false}>
              <OtelKubernetesButton />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </BottomPanel>
    ) : null;
  }

  return (
    <BottomActionContainer>
      <StickyPanel borderRadius="none" paddingSize="s">
        <EuiFlexGroup responsive={false} justifyContent="flexStart" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-expanded={isOpen}
              iconType={isOpen ? 'arrowDown' : 'arrowRight'}
              onClick={onClick}
              data-test-subj="toggleTimelineButton"
            >
              {isOpen ? hideHistory : showHistory}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {nodeType === 'pod' && (showEcsK8sButton || showOtelK8sButton) && (
            <>
              {showEcsK8sButton && (
                <EuiFlexItem grow={false}>
                  <KubernetesButton />
                </EuiFlexItem>
              )}
              {showOtelK8sButton && (
                <EuiFlexItem grow={false}>
                  <OtelKubernetesButton />
                </EuiFlexItem>
              )}
            </>
          )}
        </EuiFlexGroup>
      </StickyPanel>
      <EuiFlexGroup
        style={{
          maxHeight: isOpen ? '224px' : 0,
          transition: 'max-height 0.15s ease',
          overflow: 'hidden',
        }}
      >
        <Timeline isVisible={isOpen} interval={interval} yAxisFormatter={formatter} />
      </EuiFlexGroup>
    </BottomActionContainer>
  );
};

const BottomActionContainer = styled.div`
  position: sticky;
  bottom: 0;
  left: 0;
  background: ${(props) => props.theme.euiTheme.colors.backgroundBasePlain};
  width: calc(100% + ${(props) => props.theme.euiTheme.size.l} * 2);
  margin-left: -${(props) => props.theme.euiTheme.size.l};
`; // Additional width comes from the padding on the EuiPageBody and inner nodes container

const BottomPanel = styled(EuiPanel)`
  padding: ${(props) => props.theme.euiTheme.size.l} 0;
`;

const StickyPanel = styled(EuiPanel)`
  padding: 0 ${(props) => props.theme.euiTheme.size.l};
`;
