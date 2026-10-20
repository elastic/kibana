/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { IconType } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { SignificantEventsMaintenanceStatus } from '@kbn/significant-events-plugin/common';
import { KbnDangerCallout } from '@kbn/ui-callout';
import React from 'react';
import { DetectionStatusBadge } from './detection_status_badge';
import { MetricCell } from './metric_cell';
import {
  ACTIVE_RULES_LABEL,
  ACTIVE_RULES_TOOLTIP,
  DETECTION_PROCESS_LABEL,
  DETECTIONS_LABEL,
  DETECTIONS_TOOLTIP,
  KNOWLEDGE_INDICATORS_LABEL,
  KNOWLEDGE_INDICATORS_TOOLTIP,
  OVERVIEW_ERROR_MESSAGE,
  OVERVIEW_ERROR_TITLE,
  OVERVIEW_RETRY_LABEL,
  SIGNIFICANT_EVENTS_LABEL,
  SIGNIFICANT_EVENTS_TOOLTIP,
  SOURCES_LABEL,
  SOURCES_TOOLTIP,
} from './translations';

export interface DetectionOverviewCounts {
  sources: number;
  knowledge_indicators: number;
  active_rules: number;
  detections: number;
  significant_events: number;
}

export interface DetectionOverviewProps {
  status: SignificantEventsMaintenanceStatus | undefined;
  isStatusLoading: boolean;
  isStatusError: boolean;
  counts: DetectionOverviewCounts | undefined;
  isCountsLoading: boolean;
  isCountsError: boolean;
  onRetry: () => void;
}

export const DetectionOverview = ({
  status,
  isStatusLoading,
  isStatusError,
  counts,
  isCountsLoading,
  isCountsError,
  onRetry,
}: DetectionOverviewProps): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const metrics: Array<{
    icon: IconType;
    value: number | undefined;
    label: string;
    tooltip: string;
    testSubject: string;
  }> = [
    {
      icon: 'database',
      value: counts?.sources,
      label: SOURCES_LABEL,
      tooltip: SOURCES_TOOLTIP,
      testSubject: 'nightshiftDetectionOverviewSources',
    },
    {
      icon: 'documents',
      value: counts?.knowledge_indicators,
      label: KNOWLEDGE_INDICATORS_LABEL,
      tooltip: KNOWLEDGE_INDICATORS_TOOLTIP,
      testSubject: 'nightshiftDetectionOverviewKnowledgeIndicators',
    },
    {
      icon: 'bolt',
      value: counts?.active_rules,
      label: ACTIVE_RULES_LABEL,
      tooltip: ACTIVE_RULES_TOOLTIP,
      testSubject: 'nightshiftDetectionOverviewActiveRules',
    },
    {
      icon: 'visLine',
      value: counts?.detections,
      label: DETECTIONS_LABEL,
      tooltip: DETECTIONS_TOOLTIP,
      testSubject: 'nightshiftDetectionOverviewDetections',
    },
    {
      icon: 'bell',
      value: counts?.significant_events,
      label: SIGNIFICANT_EVENTS_LABEL,
      tooltip: SIGNIFICANT_EVENTS_TOOLTIP,
      testSubject: 'nightshiftDetectionOverviewSignificantEvents',
    },
  ];

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="l">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h2>{DETECTION_PROCESS_LABEL}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DetectionStatusBadge
            status={status}
            isLoading={isStatusLoading}
            isError={isStatusError}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      {isCountsError ? (
        <KbnDangerCallout
          announceOnMount
          title={OVERVIEW_ERROR_TITLE}
          text={OVERVIEW_ERROR_MESSAGE}
          size="s"
          data-test-subj="nightshiftDetectionOverviewError"
          actionProps={{
            primary: {
              children: OVERVIEW_RETRY_LABEL,
              iconType: 'refresh',
              onClick: onRetry,
              'data-test-subj': 'nightshiftDetectionOverviewRetryButton',
            },
          }}
        />
      ) : (
        <EuiFlexGroup gutterSize="none" wrap>
          {metrics.map((metric) => (
            <EuiFlexItem
              key={metric.testSubject}
              grow={1}
              css={css`
                min-width: 9rem;
                padding-inline: ${euiTheme.size.l};

                &:first-of-type {
                  padding-inline-start: 0;
                }

                &:not(:first-of-type) {
                  border-inline-start: ${euiTheme.border.thin};
                }
              `}
            >
              <MetricCell {...metric} isLoading={isCountsLoading} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
