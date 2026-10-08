/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type OnboardingStepStatus = 'complete' | 'current' | 'disabled';

const STEP_TITLES = [
  i18n.translate('xpack.nightshift.onboarding.steps.connect', {
    defaultMessage: 'Connect your tools',
  }),
  i18n.translate('xpack.nightshift.onboarding.steps.investigate', {
    defaultMessage: 'Try first investigation',
  }),
  i18n.translate('xpack.nightshift.onboarding.steps.automate', {
    defaultMessage: 'Create first automation',
  }),
];

/** "Get started" progress row: connect, investigate, automate. */
export function OnboardingSteps({
  statuses,
}: {
  statuses: [OnboardingStepStatus, OnboardingStepStatus, OnboardingStepStatus];
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      data-test-subj="nightshiftOnboardingSteps"
      gutterSize="m"
      responsive={false}
      alignItems="center"
    >
      {STEP_TITLES.map((title, index) => {
        const status = statuses[index];
        const isComplete = status === 'complete';
        const isCurrent = status === 'current';
        return (
          <React.Fragment key={title}>
            {index > 0 && (
              <EuiFlexItem
                grow
                aria-hidden
                css={css`
                  border-top: ${euiTheme.border.width.thick} solid
                    ${statuses[index - 1] === 'complete'
                      ? euiTheme.colors.borderStrongPrimary
                      : euiTheme.colors.borderBaseSubdued};
                  min-width: ${euiTheme.size.l};
                `}
              />
            )}
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <div
                    css={css`
                      align-items: center;
                      border-radius: 50%;
                      display: flex;
                      font-size: ${euiTheme.size.m};
                      font-weight: ${euiTheme.font.weight.bold};
                      height: ${euiTheme.size.l};
                      justify-content: center;
                      width: ${euiTheme.size.l};
                      background: ${isComplete || isCurrent
                        ? euiTheme.colors.backgroundFilledPrimary
                        : euiTheme.colors.backgroundBaseDisabled};
                      color: ${isComplete || isCurrent
                        ? euiTheme.colors.textInverse
                        : euiTheme.colors.textDisabled};
                    `}
                  >
                    {isComplete ? <EuiIcon type="check" size="s" aria-hidden={true} /> : index + 1}
                  </div>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="s"
                    color={status === 'disabled' ? 'subdued' : 'default'}
                    css={css`
                      font-weight: ${isCurrent
                        ? euiTheme.font.weight.semiBold
                        : euiTheme.font.weight.regular};
                      white-space: nowrap;
                    `}
                  >
                    {title}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </React.Fragment>
        );
      })}
    </EuiFlexGroup>
  );
}
