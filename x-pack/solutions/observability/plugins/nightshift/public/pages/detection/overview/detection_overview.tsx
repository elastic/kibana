/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

/** Column counts the banner steps through as it narrows. Four is skipped so five metrics never split 4 + 1. */
const OVERVIEW_COLUMN_STEPS = [1, 2, 3, 5] as const;
/** Narrowest a metric can get before the banner drops to the next column step. */
const OVERVIEW_METRIC_MIN_WIDTH_BASE = 12;

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
  const metricMinWidthPx = euiTheme.base * OVERVIEW_METRIC_MIN_WIDTH_BASE;
  // N columns need N * minWidth + (N - 1) * gap. Each step owns the range up to the next step.
  const getMinWidthPx = (columns: number) =>
    columns * metricMinWidthPx + (columns - 1) * euiTheme.base;
  const columnStepStyles = Object.fromEntries(
    OVERVIEW_COLUMN_STEPS.map((columns, index) => {
      const next = OVERVIEW_COLUMN_STEPS[index + 1];
      const minQuery = index === 0 ? '' : `${getMinWidthPx(columns)}px <= `;
      const maxQuery = next === undefined ? '' : ` < ${getMinWidthPx(next)}px`;
      return [
        `@container (${minQuery}width${maxQuery})`,
        {
          '& > div': { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` },
          // No hairline before the first metric of each row.
          [`& > div > *:nth-child(${columns}n + 1) [data-metric-separator]`]: { display: 'none' },
        },
      ];
    })
  );
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
      icon: 'productNightshift',
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
            <div css={{ containerType: 'inline-size', ...columnStepStyles }}>
              <div css={{ display: 'grid', gap: euiTheme.size.base, alignItems: 'center' }}>
                {metrics.map((metric, index) => (
                  <div
                    key={metric.testSubject}
                    css={{
                      minWidth: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: euiTheme.size.base,
                    }}
                  >
                    {index > 0 ? (
                      <div
                        aria-hidden
                        data-metric-separator
                        css={{
                          flexShrink: 0,
                          width: euiTheme.border.width.thin,
                          // Match EuiAvatar size="l".
                          height: euiTheme.size.xxl,
                          backgroundColor: euiTheme.colors.borderBaseSubdued,
                        }}
                      />
                    ) : null}
                    <div css={{ minWidth: 0, flex: '1 1 auto' }}>
                      <MetricCell {...metric} isLoading={isCountsLoading} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </EuiPanel>
  );
};
