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
import { AiButtonEmpty } from '@kbn/shared-ux-ai-components';
import { css } from '@emotion/react';
import type {
  AttentionLevel,
  Brief,
} from '../../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../../../../../../common/entity_analytics/executive_brief/evidence';
import { useBriefActions } from '../../actions/brief_actions_context';
import { ATTENTION_LEVEL_LABELS, EXECUTIVE_BRIEF_TEST_IDS, OWNER_LABELS } from '../../constants';
import type { TriagePeriod } from './triage_requests';
import { buildVerdictTriageRequest } from './triage_requests';
import { BriefText } from '../../evidence/brief_text';

type AccentColor = 'danger' | 'warning' | 'primary' | 'success';

interface LevelDisplay {
  icon: string;
  accent: AccentColor;
  panelColor: EuiPanelProps['color'];
}

export const ATTENTION_LEVEL_DISPLAY: Record<AttentionLevel, LevelDisplay> = {
  urgent: { icon: 'warning', accent: 'danger', panelColor: 'danger' },
  action: { icon: 'alert', accent: 'warning', panelColor: 'warning' },
  watch: { icon: 'eye', accent: 'primary', panelColor: 'primary' },
  clear: { icon: 'checkCircle', accent: 'success', panelColor: 'success' },
};

const TRIAGE_LABEL = 'Triage with AI Agent';
const REVIEW_LABEL = 'Review with AI Agent';
const VIEW_THREAT_LABEL = 'View threat';
const NEXT_STEP_LABEL = 'Next step: ';

interface AttentionVerdictProps {
  brief: Brief;
  evidence: Evidence;
  period?: TriagePeriod;
}

/** Verdict panel: level with a coloured accent border, the AI headline and summary, then the next step. */
export const AttentionVerdict: React.FC<AttentionVerdictProps> = ({ brief, evidence, period }) => {
  const { euiTheme } = useEuiTheme();
  const actions = useBriefActions();
  const { verdict, threats } = brief;
  const display = ATTENTION_LEVEL_DISPLAY[verdict.level];
  const [topThreat] = threats;
  const showNextStep = verdict.level !== 'clear' && topThreat !== undefined;
  const isWatch = verdict.level === 'watch';

  return (
    <EuiPanel
      color={display.panelColor}
      hasShadow={false}
      paddingSize="m"
      css={css`
        border-left: ${euiTheme.size.xs} solid ${euiTheme.colors[display.accent]};
      `}
      data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.verdict}
      data-level={verdict.level}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiIcon type={display.icon} color={display.accent} size="m" aria-hidden="true" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4 data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.verdictLabel}>
              {ATTENTION_LEVEL_LABELS[verdict.level]}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p
          css={css`
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
          data-test-subj="executiveBriefVerdictHeadline"
        >
          <BriefText text={verdict.headline} evidence={evidence} />
        </p>
        <p data-test-subj="executiveBriefVerdictSummary">
          <BriefText text={verdict.summary} evidence={evidence} />
        </p>
      </EuiText>
      {showNextStep ? (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="s" data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.verdictNextStep}>
                <strong>{NEXT_STEP_LABEL}</strong>
                <BriefText text={topThreat.nextStep.action} evidence={evidence} />{' '}
                <EuiText size="xs" color="subdued" component="span">
                  {`(${OWNER_LABELS[topThreat.nextStep.owner]})`}
                </EuiText>
              </EuiText>
            </EuiFlexItem>
            {actions ? (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  {actions.triage ? (
                    <EuiFlexItem grow={false}>
                      <AiButtonEmpty
                        size="s"
                        iconType="productAgent"
                        onClick={() =>
                          actions.triage?.(buildVerdictTriageRequest(brief, evidence, period))
                        }
                        data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.verdictTriage}
                      >
                        {isWatch ? REVIEW_LABEL : TRIAGE_LABEL}
                      </AiButtonEmpty>
                    </EuiFlexItem>
                  ) : null}
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="s"
                      color="text"
                      iconType="chevronSingleRight"
                      iconSide="right"
                      onClick={() => actions.openThreat(1)}
                      data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.verdictView}
                    >
                      {VIEW_THREAT_LABEL}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </>
      ) : null}
    </EuiPanel>
  );
};
