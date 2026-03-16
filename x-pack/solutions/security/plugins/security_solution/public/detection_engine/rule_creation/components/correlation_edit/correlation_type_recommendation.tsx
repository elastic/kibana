/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  EuiCallOut,
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiLoadingSpinner,
  EuiAccordion,
  EuiDescriptionList,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CorrelationTypeRecommendationWithStats } from './use_correlation_type_recommendation';

const TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.title',
  { defaultMessage: 'Recommended correlation type' }
);

const APPLY_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.apply',
  { defaultMessage: 'Apply recommendation' }
);

const LOADING_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.loading',
  { defaultMessage: 'Loading recommendation...' }
);

const ANALYSIS_DETAILS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.analysisDetails',
  { defaultMessage: 'Analysis details' }
);

const ALERT_COUNTS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.alertCounts',
  { defaultMessage: 'Alert counts per rule' }
);

const CARDINALITY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.cardinality',
  { defaultMessage: 'Group-by field cardinality' }
);

const AVG_TIME_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.avgTime',
  { defaultMessage: 'Average time between alerts' }
);

const SERVER_ANALYSIS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.serverAnalysis',
  { defaultMessage: 'Server-side analysis' }
);

const CONFIDENCE_LABELS: Record<string, string> = {
  high: i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.confidenceHigh',
    { defaultMessage: 'High confidence' }
  ),
  medium: i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.confidenceMedium',
    { defaultMessage: 'Medium confidence' }
  ),
  low: i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.confidenceLow',
    { defaultMessage: 'Low confidence' }
  ),
};

const CONFIDENCE_COLORS: Record<string, 'success' | 'warning' | 'default'> = {
  high: 'success',
  medium: 'warning',
  low: 'default',
};

const TYPE_DISPLAY_NAMES: Record<string, string> = {
  temporal: i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.typeTemporal',
    { defaultMessage: 'Temporal' }
  ),
  temporal_ordered: i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.typeTemporalOrdered',
    { defaultMessage: 'Temporal Ordered' }
  ),
  event_count: i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.typeEventCount',
    { defaultMessage: 'Event Count' }
  ),
  value_count: i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.typeValueCount',
    { defaultMessage: 'Value Count' }
  ),
};

const formatMs = (ms: number): string => {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
};

const formatRecord = (record: Record<string, number>): string => {
  const entries = Object.entries(record);
  if (entries.length === 0) return 'None';
  return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
};

interface CorrelationTypeRecommendationCalloutProps {
  recommendation: CorrelationTypeRecommendationWithStats | undefined;
  currentType: string;
  onApply: (type: string) => void;
  isLoading?: boolean;
}

export const CorrelationTypeRecommendationCallout = memo<CorrelationTypeRecommendationCalloutProps>(
  ({ recommendation, currentType, onApply, isLoading }) => {
    const [isAccordionOpen, setIsAccordionOpen] = useState(false);

    const handleApply = useCallback(() => {
      if (recommendation) {
        onApply(recommendation.type);
      }
    }, [onApply, recommendation]);

    const handleAccordionToggle = useCallback((isOpen: boolean) => {
      setIsAccordionOpen(isOpen);
    }, []);

    if (isLoading) {
      return (
        <>
          <EuiCallOut
            title={TITLE}
            color="primary"
            iconType="sparkles"
            data-test-subj="correlationTypeRecommendationLoading"
          >
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">{LOADING_LABEL}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      );
    }

    if (!recommendation || recommendation.type === currentType) {
      return null;
    }

    const { stats } = recommendation;
    const statsDescriptionList = stats
      ? [
          {
            title: ALERT_COUNTS_LABEL,
            description: formatRecord(stats.alertCountPerRule),
          },
          {
            title: CARDINALITY_LABEL,
            description: formatRecord(stats.groupByCardinality),
          },
          {
            title: AVG_TIME_LABEL,
            description:
              stats.avgTimeBetweenAlerts !== null ? formatMs(stats.avgTimeBetweenAlerts) : 'N/A',
          },
        ]
      : null;

    return (
      <>
        <EuiCallOut
          title={TITLE}
          color="primary"
          iconType="sparkles"
          data-test-subj="correlationTypeRecommendation"
        >
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <strong>{TYPE_DISPLAY_NAMES[recommendation.type]}</strong>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={CONFIDENCE_COLORS[recommendation.confidence]}>
                {CONFIDENCE_LABELS[recommendation.confidence]}
              </EuiBadge>
            </EuiFlexItem>
            {stats && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{SERVER_ANALYSIS_LABEL}</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <p>{recommendation.reason}</p>

          {statsDescriptionList && (
            <>
              <EuiSpacer size="s" />
              <EuiAccordion
                id="correlationRecommendationDetails"
                buttonContent={ANALYSIS_DETAILS_LABEL}
                forceState={isAccordionOpen ? 'open' : 'closed'}
                onToggle={handleAccordionToggle}
                data-test-subj="correlationTypeRecommendationDetails"
              >
                <EuiSpacer size="xs" />
                <EuiDescriptionList
                  type="column"
                  compressed
                  listItems={statsDescriptionList}
                  data-test-subj="correlationTypeRecommendationStats"
                />
              </EuiAccordion>
            </>
          )}

          <EuiSpacer size="s" />
          <EuiButton
            size="s"
            onClick={handleApply}
            data-test-subj="correlationTypeRecommendationApply"
          >
            {APPLY_BUTTON}
          </EuiButton>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  }
);
CorrelationTypeRecommendationCallout.displayName = 'CorrelationTypeRecommendationCallout';
