/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css, keyframes } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const DOT_SIZE = 3;

const dotPulse = keyframes`
  0%, 80%, 100% {
    opacity: 0.25;
  }
  40% {
    opacity: 1;
  }
`;

const TypingDots = (): React.ReactElement => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      aria-hidden={true}
      data-test-subj="nightshiftDecisionTreeCardTypingDots"
      css={css`
        display: inline-flex;
        gap: 2px;
        margin-left: ${euiTheme.size.xs};
        vertical-align: middle;

        > span {
          width: ${DOT_SIZE}px;
          height: ${DOT_SIZE}px;
          border-radius: 50%;
          background: ${euiTheme.colors.textSubdued};
          animation: ${dotPulse} 1.2s ease-in-out infinite;
        }
        > span:nth-of-type(2) {
          animation-delay: 0.15s;
        }
        > span:nth-of-type(3) {
          animation-delay: 0.3s;
        }

        @media (prefers-reduced-motion: reduce) {
          > span {
            animation: none;
          }
        }
      `}
    >
      <span />
      <span />
      <span />
    </span>
  );
};

export const getHypothesesAnalyzedLabel = (count: number): string =>
  i18n.translate('xpack.nightshiftInvestigations.decisionTreeCard.description', {
    defaultMessage: '{count, plural, one {# hypothesis analyzed} other {# hypotheses analyzed}}',
    values: { count },
  });

export interface DecisionTreeCardProps {
  hypothesisCount: number;
  isRunning: boolean;
  onOpen: () => void;
}

/** Entry point to the Hypothesis Tree, summarising how many hypotheses were analyzed. */
export function DecisionTreeCard({
  hypothesisCount,
  isRunning,
  onOpen,
}: DecisionTreeCardProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const title = i18n.translate('xpack.nightshiftInvestigations.decisionTreeCard.title', {
    defaultMessage: 'View Hypothesis Tree',
  });
  const description = getHypothesesAnalyzedLabel(hypothesisCount);

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      onClick={onOpen}
      aria-label={i18n.translate('xpack.nightshiftInvestigations.decisionTreeCard.ariaLabel', {
        defaultMessage: 'Open the Hypothesis Tree: {description}',
        values: { description },
      })}
      data-test-subj="nightshiftInvestigationDecisionTreeButton"
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <span
            css={css`
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: ${euiTheme.size.xl};
              height: ${euiTheme.size.xl};
              border-radius: ${euiTheme.border.radius.medium};
              background: ${euiTheme.colors.backgroundBaseAssistance};
            `}
          >
            <EuiIcon type="branch" color={euiTheme.colors.textAssistance} aria-hidden={true} />
          </span>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{title}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {description}
            {isRunning && <TypingDots />}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="chevronSingleRight" color="subdued" aria-hidden={true} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
