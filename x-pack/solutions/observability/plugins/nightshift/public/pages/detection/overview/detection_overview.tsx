/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
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
import { MetricCell, type MetricCellProps } from './metric_cell';
import {
  DETECTION_ENGINE_LABEL,
  getKnowledgeIndicatorsLabel,
  getRulesLabel,
  getSignalsLabel,
  getSignificantEventsLabel,
  getEntitiesLabel,
  OVERVIEW_ERROR_MESSAGE,
  OVERVIEW_ERROR_TITLE,
  OVERVIEW_RETRY_LABEL,
} from './translations';

export interface DetectionOverviewCounts {
  entities: number;
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
  compact?: boolean;
}

export const DetectionOverview = ({
  status,
  isStatusLoading,
  isStatusError,
  counts,
  isCountsLoading,
  isCountsError,
  onRetry,
  compact = false,
}: DetectionOverviewProps): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const metrics: Array<Omit<MetricCellProps, 'isLoading'>> = [
    {
      icon: 'chartTagCloud',
      tone: 'neutral',
      value: counts?.knowledge_indicators,
      getLabel: getKnowledgeIndicatorsLabel,
      testSubject: 'nightshiftDetectionOverviewKnowledgeIndicators',
    },
    {
      icon: 'cube',
      tone: 'neutral',
      value: counts?.entities,
      getLabel: getEntitiesLabel,
      testSubject: 'nightshiftDetectionOverviewEntities',
    },
    {
      icon: 'radar',
      tone: 'neutral',
      value: counts?.active_rules,
      getLabel: getRulesLabel,
      testSubject: 'nightshiftDetectionOverviewActiveRules',
    },
    {
      icon: 'moon',
      tone: 'warning',
      value: counts?.detections,
      getLabel: getSignalsLabel,
      testSubject: 'nightshiftDetectionOverviewSignals',
    },
    {
      icon: 'warning',
      tone: 'danger',
      value: counts?.significant_events,
      getLabel: getSignificantEventsLabel,
      testSubject: 'nightshiftDetectionOverviewSignificantEvents',
    },
  ];

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      grow={false}
      paddingSize="m"
      data-test-subj={
        compact ? 'nightshiftDetectionOverviewCompact' : 'nightshiftDetectionOverview'
      }
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h2>{DETECTION_ENGINE_LABEL}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DetectionStatusBadge
            status={status}
            isLoading={isStatusLoading}
            isError={isStatusError}
            data-test-subj={compact ? 'nightshiftDetectionCompactStatus' : undefined}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {!compact && (
        <>
          <EuiSpacer size="m" />
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
            <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" wrap>
              {metrics.map((metric) => (
                <EuiFlexItem
                  key={metric.testSubject}
                  grow={false}
                  css={css`
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
        </>
      )}
    </EuiPanel>
  );
};
