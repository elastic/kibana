/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, keyframes } from '@emotion/react';
import React from 'react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import {
  SvgAiGradientDefs,
  useAiButtonGradientStyles,
  useSvgAiGradient,
} from '@kbn/shared-ux-ai-components';
import type { SignificantEventStatus } from '@kbn/significant-events-schema';
import { getStatusLabel, isNeedsActionStatus } from '../significant_event_status';

// Staggered offsets so the dots pulse in sequence (typing-indicator effect).
const INVESTIGATING_DOT_DELAYS_MS = [0, 160, 320] as const;

const investigatingDotAnimation = keyframes`
  0%, 80%, 100% {
    opacity: 0.35;
    transform: scale(0.75);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
`;

function InvestigatingStatus({ label }: { label: string }) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiBadge
      color="hollow"
      css={css`
        color: ${euiTheme.colors.textSubdued};
      `}
    >
      <span
        css={css`
          align-items: center;
          display: inline-flex;
          gap: calc(${euiTheme.size.xs} + ${euiTheme.size.xxs});
        `}
      >
        {label}
        <span
          aria-hidden={true}
          data-test-subj="nightshiftInvestigatingStatusDots"
          css={css`
            align-items: center;
            display: inline-flex;
            gap: ${euiTheme.size.xxs};
          `}
        >
          {INVESTIGATING_DOT_DELAYS_MS.map((delay) => (
            <span
              key={delay}
              css={css`
                animation: ${investigatingDotAnimation} 1.2s ease-in-out ${delay}ms infinite;
                background: ${euiTheme.colors.mediumShade};
                border-radius: 50%;
                height: ${euiTheme.size.xs};
                width: ${euiTheme.size.xs};

                @media (prefers-reduced-motion: reduce) {
                  animation: none;
                }
              `}
            />
          ))}
        </span>
      </span>
    </EuiBadge>
  );
}

function InvestigatedStatus({ label }: { label: string }) {
  const { euiTheme } = useEuiTheme();
  const { labelCss } = useAiButtonGradientStyles({ variant: 'outlined' });
  const { gradientId, iconGradientCss, colors } = useSvgAiGradient({ variant: 'outlined' });

  const borderGradient = `linear-gradient(90deg, ${euiTheme.colors.backgroundLightPrimary} 2.98%, ${euiTheme.colors.backgroundLightAssistance} 66.24%)`;

  return (
    <>
      <SvgAiGradientDefs gradientId={gradientId} colors={colors} />
      <EuiBadge
        color="hollow"
        iconType="check"
        iconSide="left"
        data-test-subj="nightshiftInvestigatedStatus"
        css={[
          iconGradientCss,
          css`
            background: linear-gradient(
                  ${euiTheme.colors.backgroundBasePlain},
                  ${euiTheme.colors.backgroundBasePlain}
                )
                padding-box,
              ${borderGradient} border-box;
            border: ${euiTheme.border.width.thin} solid transparent;
            border-radius: ${euiTheme.size.l};

            .euiBadge__text {
              ${labelCss}
            }
          `,
        ]}
      >
        {label}
      </EuiBadge>
    </>
  );
}

/**
 * Animated "Investigating" badge while the event needs action, AI-gradient
 * "Investigated" badge once resolved. Shared between the event list items and
 * the flyout header.
 */
export function InvestigationStatusBadge({
  status,
}: {
  status: SignificantEventStatus;
}): React.ReactElement {
  const label = getStatusLabel(status);

  return isNeedsActionStatus(status) ? (
    <InvestigatingStatus label={label} />
  ) : (
    <InvestigatedStatus label={label} />
  );
}
