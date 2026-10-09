/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AiIcon } from '@kbn/shared-ux-ai-components';
import type { ExecutiveBriefJob } from '../../../../../../common/entity_analytics/executive_brief/types';
import { TEST_IDS } from '../../test_ids';
import { iconPulseStyles, labelGlowStyles } from './animation_styles';
import {
  BRIEF_LOADING_STEPS,
  STAGE_LABEL,
  STARTING_LABEL,
  formatElapsed,
  getExpectationCopy,
  getStepStates,
} from './steps';
import { useElapsedMs } from './use_elapsed';

export const BRIEF_LOADING_TEST_IDS = {
  steps: 'executiveBriefLoadingSteps',
  step: (id: string) => `executiveBriefLoadingStep-${id}`,
  stageLabel: 'executiveBriefLoadingStage',
  timer: 'executiveBriefLoadingTimer',
} as const;

export interface BriefLoadingProps {
  job: ExecutiveBriefJob | undefined;
}

export const BriefLoading: React.FC<BriefLoadingProps> = ({ job }) => {
  const { euiTheme } = useEuiTheme();
  const stage = job?.stage;
  const isTemplate = job?.params.generator === 'template';
  const elapsedMs = useElapsedMs(job?.startedAt ?? job?.createdAt, true);
  const states = getStepStates(stage);

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      justifyContent="center"
      gutterSize="m"
      responsive={false}
      data-test-subj={TEST_IDS.progress}
      css={css`
        min-height: 60vh;
        padding: ${euiTheme.size.xxl} ${euiTheme.size.base};
        text-align: center;
      `}
    >
      <EuiFlexItem grow={false}>
        <span css={iconPulseStyles}>
          <AiIcon iconType="sparkles" size="xxl" aria-hidden={true} />
        </span>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="m">
          <p
            aria-live="polite"
            data-test-subj={BRIEF_LOADING_TEST_IDS.stageLabel}
            css={[
              css`
                font-weight: ${euiTheme.font.weight.semiBold};
                color: ${euiTheme.colors.primary};
              `,
              labelGlowStyles,
            ]}
          >
            {stage ? STAGE_LABEL[stage] : STARTING_LABEL}
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued" data-test-subj={BRIEF_LOADING_TEST_IDS.timer}>
          <p>{`${formatElapsed(elapsedMs)} · ${getExpectationCopy(isTemplate)}`}</p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ol
          aria-label="Brief generation progress"
          data-test-subj={BRIEF_LOADING_TEST_IDS.steps}
          css={css`
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: ${euiTheme.size.xs} ${euiTheme.size.l};
            list-style: none;
            margin: ${euiTheme.size.m} 0 0;
            padding: 0;
          `}
        >
          {BRIEF_LOADING_STEPS.map((step, index) => {
            const state = states[index];
            return (
              <li
                key={step.id}
                data-test-subj={BRIEF_LOADING_TEST_IDS.step(step.id)}
                data-step-state={state}
                aria-current={state === 'current' ? 'step' : undefined}
                css={css`
                  display: inline-flex;
                  align-items: center;
                  gap: ${euiTheme.size.xs};
                  font-size: ${euiTheme.size.m};
                  color: ${state === 'upcoming'
                    ? euiTheme.colors.textDisabled
                    : state === 'current'
                    ? euiTheme.colors.textHeading
                    : euiTheme.colors.textSubdued};
                  font-weight: ${state === 'current'
                    ? euiTheme.font.weight.bold
                    : euiTheme.font.weight.regular};
                `}
              >
                <EuiIcon
                  type={state === 'complete' ? 'check' : 'dot'}
                  size="s"
                  color={state === 'current' ? 'primary' : 'subdued'}
                  aria-hidden={true}
                />
                <span>{step.label}</span>
                {state === 'complete' && (
                  <EuiScreenReaderOnly>
                    <span>{'(done)'}</span>
                  </EuiScreenReaderOnly>
                )}
              </li>
            );
          })}
        </ol>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
