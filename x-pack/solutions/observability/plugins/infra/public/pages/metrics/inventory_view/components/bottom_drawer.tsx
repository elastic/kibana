/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIconTip,
  EuiButtonEmpty,
  EuiPanel,
} from '@elastic/eui';
import styled from '@emotion/styled';
import { useUiTracker } from '@kbn/observability-shared-plugin/public';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { useWaffleOptionsContext } from '../hooks/use_waffle_options';
import type { InfraFormatter } from '../../../../common/inventory/types';
import { Timeline } from './timeline/timeline';
import { KubernetesDashboardLink } from '../../../../components/kubernetes_dashboard_promotion/kubernetes_dashboard_promotion';
import { useKubernetesDashboardPromotion } from '../../../../hooks/use_kubernetes_dashboard_promotion';

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
  loading: boolean;
}

const RelatedDashboards = () => {
  return (
    <EuiText size="s">
      {i18n.translate('xpack.infra.bottomDrawer.relatedDashboardsTextLabel', {
        defaultMessage: 'Related Dashboards',
      })}{' '}
      <EuiIconTip
        content={i18n.translate('xpack.infra.bottomDrawer.relatedDashboardsTooltip', {
          defaultMessage: 'We found these dashboards related to your query',
        })}
        type="question"
        aria-label={i18n.translate('xpack.infra.bottomDrawer.relatedDashboardsTooltipAriaLabel', {
          defaultMessage: 'Learn why these dashboards are related',
        })}
      />
    </EuiText>
  );
};

export const BottomDrawer = ({ interval, formatter, view, nodeType, loading }: Props) => {
  const { timelineOpen, changeTimelineOpen } = useWaffleOptionsContext();
  const [isOpen, setIsOpen] = useState(Boolean(timelineOpen));

  const { hasEcsSchema, hasSemconvSchema, hasEcsK8sIntegration, hasSemconvK8sIntegration } =
    useKubernetesDashboardPromotion(nodeType);

  const showEcsK8sButton = !loading && hasEcsSchema && hasEcsK8sIntegration;
  const showSemconvK8sButton = !loading && hasSemconvSchema && hasSemconvK8sIntegration;

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
    return nodeType === 'pod' && (showEcsK8sButton || showSemconvK8sButton) ? (
      <BottomPanel hasBorder={false} hasShadow={false} borderRadius="none" paddingSize="s">
        <EuiFlexGroup responsive={false} justifyContent="flexStart" alignItems="center">
          <RelatedDashboards />
          {showEcsK8sButton && (
            <EuiFlexItem grow={false}>
              <KubernetesDashboardLink integrationType="ecs" />
            </EuiFlexItem>
          )}
          {showSemconvK8sButton && (
            <EuiFlexItem grow={false}>
              <KubernetesDashboardLink integrationType="semconv" />
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
          {nodeType === 'pod' && (showEcsK8sButton || showSemconvK8sButton) && (
            <>
              <RelatedDashboards />
              {showEcsK8sButton && (
                <EuiFlexItem grow={false}>
                  <KubernetesDashboardLink integrationType="ecs" />
                </EuiFlexItem>
              )}
              {showSemconvK8sButton && (
                <EuiFlexItem grow={false}>
                  <KubernetesDashboardLink integrationType="semconv" />
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
