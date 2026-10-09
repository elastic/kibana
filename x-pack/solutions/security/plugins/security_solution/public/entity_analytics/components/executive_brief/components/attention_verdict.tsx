/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiPanelProps } from '@elastic/eui';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { css } from '@emotion/react';
import type {
  AttentionAssessment,
  AttentionLevel,
  BriefSnapshot,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { TEST_IDS } from '../test_ids';
import { buildNextStep, getTopArea } from '../utils/triage_prompts';
import type { BriefForTriage } from './attention_area_rows';
import { useAttentionActions } from './attention_area_rows';
import { useIsPrintMode } from './brief_context';

interface LevelDisplay {
  label: string;
  icon: string;
  iconColor: 'danger' | 'warning' | 'primary' | 'success';
  /** Theme colour key used for the accent border. */
  borderColor: 'danger' | 'warning' | 'primary' | 'success';
  panelColor: EuiPanelProps['color'];
}

export const ATTENTION_LEVEL_DISPLAY: Record<AttentionLevel, LevelDisplay> = {
  urgent: {
    label: 'Urgent attention needed',
    icon: 'warning',
    iconColor: 'danger',
    borderColor: 'danger',
    panelColor: 'danger',
  },
  action: {
    label: 'Attention needed',
    icon: 'alert',
    iconColor: 'warning',
    borderColor: 'warning',
    panelColor: 'warning',
  },
  watch: {
    label: 'Keep watching',
    icon: 'eye',
    iconColor: 'primary',
    borderColor: 'primary',
    panelColor: 'primary',
  },
  clear: {
    label: 'No action needed',
    icon: 'checkCircle',
    iconColor: 'success',
    borderColor: 'success',
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
  /** Needed for the next step and the actions; without it only the level is shown. */
  snapshot?: BriefSnapshot;
  brief?: BriefForTriage;
  children?: React.ReactNode;
}

type AssessmentLike = Pick<AttentionAssessment, 'level' | 'trend'> &
  Partial<Pick<AttentionAssessment, 'areas'>>;

const VIEW_LABELS = {
  threats: 'View threat',
  response: 'View threat',
  coverage: 'View blind spots',
  visibility: 'View blind spots',
} as const;

/** Compact level label with icon and a coloured accent border, plus a trend hint; children render below (the headline). */
export const AttentionVerdict: React.FC<AttentionVerdictProps> = ({
  assessment,
  snapshot,
  brief,
  children,
}) => {
  const { euiTheme } = useEuiTheme();
  const isPrintMode = useIsPrintMode();
  const display = assessment ? ATTENTION_LEVEL_DISPLAY[assessment.level] : undefined;
  const trend = assessment?.trend;
  return (
    <EuiPanel
      color={display?.panelColor ?? 'subdued'}
      hasShadow={false}
      paddingSize="m"
      css={css`
        border-left: ${euiTheme.size.xs} solid
          ${display ? euiTheme.colors[display.borderColor] : euiTheme.colors.mediumShade};
      `}
      data-test-subj={TEST_IDS.attentionVerdict}
      data-level={assessment?.level ?? 'unavailable'}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={display?.icon ?? 'questionInCircle'}
            color={display?.iconColor ?? 'subdued'}
            size="m"
            aria-hidden="true"
            data-test-subj="executiveBriefAttentionIcon"
            data-icon-type={display?.icon ?? 'questionInCircle'}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
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
      {assessment && snapshot && assessment.level !== 'clear' ? (
        <VerdictNextStep
          assessment={assessment}
          snapshot={snapshot}
          brief={brief}
          showActions={!isPrintMode}
        />
      ) : null}
    </EuiPanel>
  );
};

interface VerdictNextStepProps {
  assessment: AssessmentLike;
  snapshot: BriefSnapshot;
  brief?: BriefForTriage;
  showActions: boolean;
}

const VerdictNextStep: React.FC<VerdictNextStepProps> = ({
  assessment,
  snapshot,
  brief,
  showActions,
}) => {
  const actions = useAttentionActions(snapshot, brief);
  const topArea = getTopArea({ level: assessment.level, areas: assessment.areas ?? [] });
  if (!topArea) return null;
  const isWatch = assessment.level === 'watch';
  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s" data-test-subj="executiveBriefNextStep">
            <strong>{'Next step: '}</strong>
            {buildNextStep(topArea, snapshot)}
          </EuiText>
        </EuiFlexItem>
        {showActions ? (
          <>
            {actions.canTriage ? (
              <EuiFlexItem grow={false}>
                <AiButton
                  size="s"
                  iconType="productAgent"
                  onClick={() => actions.triage(topArea)}
                  data-test-subj="executiveBriefVerdictTriage"
                >
                  {isWatch ? 'Review with AI Agent' : 'Triage with AI Agent'}
                </AiButton>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={() => actions.view(topArea)}
                data-test-subj="executiveBriefVerdictView"
              >
                {isWatch ? 'View' : VIEW_LABELS[topArea.id]}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </>
        ) : null}
      </EuiFlexGroup>
    </>
  );
};
