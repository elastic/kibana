/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiIcon, EuiLink, EuiPanel, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type OnboardingStepId = 'connect' | 'investigate' | 'automate';

export type OnboardingStepStatus = 'complete' | 'current' | 'disabled';

export interface OnboardingStepState {
  status: OnboardingStepStatus;
  /** Makes the step title a link to that step. */
  onClick?: () => void;
  /** Short line under the step title. */
  hint?: string;
}

const STEP_TITLES: Record<OnboardingStepId, string> = {
  connect: i18n.translate('xpack.nightshift.onboarding.steps.connect', {
    defaultMessage: 'Add signals and alerts',
  }),
  investigate: i18n.translate('xpack.nightshift.onboarding.steps.investigate', {
    defaultMessage: 'Try first investigation',
  }),
  automate: i18n.translate('xpack.nightshift.onboarding.steps.automate', {
    defaultMessage: 'Create first automation',
  }),
};

const STEP_IDS: OnboardingStepId[] = ['connect', 'investigate', 'automate'];

/** The "Get started" card: a vertical stepper, then the current step's action. */
export function OnboardingStepsCard({
  steps,
  action,
}: {
  steps: Record<OnboardingStepId, OnboardingStepState>;
  action?: React.ReactNode;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const indicatorSize = euiTheme.size.xl;

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="nightshiftOnboardingSteps">
      <EuiTitle size="xxs">
        <h2>
          {i18n.translate('xpack.nightshift.onboarding.getStartedTitle', {
            defaultMessage: 'Get started',
          })}
        </h2>
      </EuiTitle>
      <ol
        css={css`
          list-style: none;
          margin: ${euiTheme.size.base} 0 0;
          padding: 0;
        `}
      >
        {STEP_IDS.map((stepId, index) => {
          const { status, onClick, hint } = steps[stepId];
          const isComplete = status === 'complete';
          const isCurrent = status === 'current';
          const isLast = index === STEP_IDS.length - 1;
          const title = STEP_TITLES[stepId];
          return (
            <li
              key={stepId}
              data-test-subj={`nightshiftOnboardingStep-${stepId}`}
              aria-current={isCurrent ? 'step' : undefined}
              css={css`
                display: grid;
                grid-template-columns: ${indicatorSize} 1fr;
                column-gap: ${euiTheme.size.m};
              `}
            >
              <div
                css={css`
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                `}
              >
                <div
                  css={css`
                    align-items: center;
                    border-radius: 50%;
                    display: flex;
                    flex-shrink: 0;
                    font-size: ${euiTheme.size.m};
                    font-weight: ${euiTheme.font.weight.medium};
                    height: ${indicatorSize};
                    justify-content: center;
                    width: ${indicatorSize};
                    background: ${isComplete
                      ? euiTheme.colors.backgroundLightSuccess
                      : isCurrent
                      ? euiTheme.colors.backgroundLightPrimary
                      : euiTheme.colors.backgroundBaseSubdued};
                    color: ${isComplete
                      ? euiTheme.colors.textSuccess
                      : isCurrent
                      ? euiTheme.colors.textPrimary
                      : euiTheme.colors.textSubdued};
                  `}
                >
                  {isComplete ? <EuiIcon type="check" size="m" aria-hidden={true} /> : index + 1}
                </div>
                {!isLast && (
                  <div
                    aria-hidden
                    css={css`
                      flex-grow: 1;
                      min-height: ${euiTheme.size.m};
                      width: ${euiTheme.border.width.thin};
                      background: ${euiTheme.colors.borderBaseSubdued};
                    `}
                  />
                )}
              </div>
              <div
                css={css`
                  min-height: ${indicatorSize};
                  padding-bottom: ${isLast ? 0 : euiTheme.size.m};
                  display: flex;
                  flex-direction: column;
                  justify-content: ${hint ? 'flex-start' : 'center'};
                  padding-top: ${hint ? euiTheme.size.xs : 0};
                `}
              >
                <EuiText
                  size="s"
                  color={isCurrent || isComplete ? 'default' : 'subdued'}
                  css={css`
                    font-weight: ${isCurrent
                      ? euiTheme.font.weight.semiBold
                      : euiTheme.font.weight.regular};
                    ${hint ? '' : `line-height: ${indicatorSize};`}
                  `}
                >
                  {onClick ? (
                    <EuiLink
                      color="text"
                      onClick={onClick}
                      data-test-subj={`nightshiftOnboardingStepLink-${stepId}`}
                    >
                      {title}
                    </EuiLink>
                  ) : (
                    title
                  )}
                </EuiText>
                {hint && (
                  <EuiText size="xs" color="subdued">
                    {hint}
                  </EuiText>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {action && (
        <div
          css={css`
            margin-top: ${euiTheme.size.base};
          `}
        >
          {action}
        </div>
      )}
    </EuiPanel>
  );
}
