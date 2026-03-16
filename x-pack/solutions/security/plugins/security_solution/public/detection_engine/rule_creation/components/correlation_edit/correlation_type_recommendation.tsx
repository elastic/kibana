/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import {
  EuiCallOut,
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CorrelationTypeRecommendation } from './use_correlation_type_recommendation';

const TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.title',
  { defaultMessage: 'Recommended correlation type' }
);

const APPLY_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.apply',
  { defaultMessage: 'Apply recommendation' }
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

interface CorrelationTypeRecommendationCalloutProps {
  recommendation: CorrelationTypeRecommendation;
  currentType: string;
  onApply: (type: string) => void;
}

export const CorrelationTypeRecommendationCallout = memo<CorrelationTypeRecommendationCalloutProps>(
  ({ recommendation, currentType, onApply }) => {
    const handleApply = useCallback(() => {
      onApply(recommendation.type);
    }, [onApply, recommendation.type]);

    if (recommendation.type === currentType) {
      return null;
    }

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
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <p>{recommendation.reason}</p>
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
