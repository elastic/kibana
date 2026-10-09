/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import type { EuiPanelProps } from '@elastic/eui';
import type {
  AttentionAssessment,
  AttentionLevel,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { TEST_IDS } from '../test_ids';

interface LevelDisplay {
  label: string;
  icon: string;
  iconColor: 'danger' | 'warning' | 'primary' | 'success';
  panelColor: EuiPanelProps['color'];
}

export const ATTENTION_LEVEL_DISPLAY: Record<AttentionLevel, LevelDisplay> = {
  urgent: {
    label: 'Urgent attention needed',
    icon: 'warning',
    iconColor: 'danger',
    panelColor: 'danger',
  },
  action: {
    label: 'Attention needed',
    icon: 'alert',
    iconColor: 'warning',
    panelColor: 'warning',
  },
  watch: { label: 'Keep watching', icon: 'eye', iconColor: 'primary', panelColor: 'primary' },
  clear: {
    label: 'No action needed',
    icon: 'checkCircle',
    iconColor: 'success',
    panelColor: 'success',
  },
};

export const UNAVAILABLE_LABEL = 'Assessment unavailable for this brief — regenerate';

export const TREND_TEXT: Record<'more' | 'less', string> = {
  more: '▲ more activity than last period',
  less: '▼ less activity than last period',
};

interface AttentionVerdictProps {
  /** Undefined for briefs generated before the assessment existed. */
  assessment?: AssessmentLike;
  children?: React.ReactNode;
}

type AssessmentLike = Pick<AttentionAssessment, 'level' | 'trend'>;

/** Large level label with icon and colour, plus a trend hint; children render below (the headline). */
export const AttentionVerdict: React.FC<AttentionVerdictProps> = ({ assessment, children }) => {
  const display = assessment ? ATTENTION_LEVEL_DISPLAY[assessment.level] : undefined;
  const trend = assessment?.trend;
  return (
    <EuiPanel
      color={display?.panelColor ?? 'subdued'}
      hasShadow={false}
      paddingSize="l"
      data-test-subj={TEST_IDS.attentionVerdict}
      data-level={assessment?.level ?? 'unavailable'}
    >
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={display?.icon ?? 'questionInCircle'}
            color={display?.iconColor ?? 'subdued'}
            size="xl"
            aria-hidden="true"
            data-test-subj="executiveBriefAttentionIcon"
            data-icon-type={display?.icon ?? 'questionInCircle'}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h4 data-test-subj="executiveBriefAttentionLabel">
              {display?.label ?? UNAVAILABLE_LABEL}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        {trend === 'more' || trend === 'less' ? (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" data-test-subj="executiveBriefAttentionTrend">
              {TREND_TEXT[trend]}
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {children}
    </EuiPanel>
  );
};
