/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, keyframes } from '@emotion/react';
import React from 'react';
import { EuiBadge, EuiIcon, EuiText, useEuiTheme, type EuiTextProps } from '@elastic/eui';
import {
  SvgAiGradientDefs,
  useAiButtonGradientStyles,
  useSvgAiGradient,
} from '@kbn/shared-ux-ai-components';
import { i18n } from '@kbn/i18n';
import type { InvestigationStatus } from '@kbn/investigation-output';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import {
  getInvestigationWorkflowStatusLabel,
  isInvestigationInvestigated,
  isInvestigationTerminalFailure,
} from '../common/investigation_progress_status';
import {
  getInvestigationStatusLabel,
  getLatestInvestigation,
  getRememberedInvestigationTerminalFailure,
  isEventInvestigated,
} from '../event/significant_event_status';
import { nightshiftReducedMotionStyles } from '../common/transition';

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

function InvestigatingStatusDots({
  testSubj = 'nightshiftInvestigatingStatusDots',
}: {
  testSubj?: string;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      aria-hidden={true}
      data-test-subj={testSubj}
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
            animation: ${investigatingDotAnimation} 1.4s ${euiTheme.animation.resistance} ${delay}ms
              infinite;
            background: ${euiTheme.colors.mediumShade};
            border-radius: 50%;
            height: ${euiTheme.size.xs};
            width: ${euiTheme.size.xs};

            ${nightshiftReducedMotionStyles}
          `}
        />
      ))}
    </span>
  );
}

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
        <InvestigatingStatusDots />
      </span>
    </EuiBadge>
  );
}

const COMPLETE_STATUS_CHECK_SIZE_PX = 12;
const COMPLETE_STATUS_CIRCLE_SIZE_PX = 20;
const HYPOTHESIS_STATUS_CIRCLE_SIZE_PX = 16;

function InvestigationCompleteCheckIcon({
  ariaLabel,
  testSubj,
  size = 'default',
}: {
  ariaLabel: string;
  testSubj?: string;
  size?: 'default' | 'compact';
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { gradientId, iconGradientCss, colors } = useSvgAiGradient({ variant: 'outlined' });

  if (size === 'compact') {
    const borderGradient = `linear-gradient(130.84deg, ${euiTheme.colors.backgroundFilledPrimary} 2.98%, ${euiTheme.colors.backgroundFilledAssistance} 66.24%)`;

    return (
      <>
        <SvgAiGradientDefs gradientId={gradientId} colors={colors} />
        <span
          aria-label={ariaLabel}
          data-test-subj={testSubj}
          css={[
            iconGradientCss,
            css`
              align-items: center;
              background: linear-gradient(
                    ${euiTheme.colors.backgroundBasePlain},
                    ${euiTheme.colors.backgroundBasePlain}
                  )
                  padding-box,
                ${borderGradient} border-box;
              border: ${euiTheme.border.width.thin} solid transparent;
              border-radius: 50%;
              display: inline-flex;
              flex-shrink: 0;
              height: ${HYPOTHESIS_STATUS_CIRCLE_SIZE_PX}px;
              justify-content: center;
              width: ${HYPOTHESIS_STATUS_CIRCLE_SIZE_PX}px;
            `,
          ]}
        >
          <EuiIcon
            type="check"
            aria-hidden={true}
            css={css`
              height: 10px;
              width: 10px;
            `}
          />
        </span>
      </>
    );
  }

  return (
    <>
      <SvgAiGradientDefs gradientId={gradientId} colors={colors} />
      <span
        aria-label={ariaLabel}
        data-test-subj={testSubj}
        css={css`
          align-items: center;
          background: linear-gradient(
            130.84deg,
            ${euiTheme.colors.backgroundFilledPrimary} 2.98%,
            ${euiTheme.colors.backgroundFilledAssistance} 66.24%
          );
          border-radius: 50%;
          display: inline-flex;
          flex-shrink: 0;
          height: ${COMPLETE_STATUS_CIRCLE_SIZE_PX}px;
          justify-content: center;
          width: ${COMPLETE_STATUS_CIRCLE_SIZE_PX}px;
        `}
      >
        <EuiIcon
          type="check"
          color="ghost"
          aria-hidden={true}
          css={css`
            height: ${COMPLETE_STATUS_CHECK_SIZE_PX}px;
            width: ${COMPLETE_STATUS_CHECK_SIZE_PX}px;
          `}
        />
      </span>
    </>
  );
}

function InvestigationCompleteStatus({
  label,
  testSubj,
}: {
  label: string;
  testSubj?: string;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const completeStatusLabel = i18n.translate(
    'xpack.nightshift.investigation.completeStatusAriaLabel',
    {
      defaultMessage: 'Investigation complete',
    }
  );

  return (
    <span
      data-test-subj={testSubj}
      css={css`
        align-items: center;
        display: inline-flex;
        font-weight: ${euiTheme.font.weight.semiBold};
        gap: ${euiTheme.size.s};
      `}
    >
      <InvestigationCompleteCheckIcon ariaLabel={completeStatusLabel} />
      {label}
    </span>
  );
}

function InvestigationGradientLabel({
  children,
  testSubj,
  size = 'xs',
}: {
  children: React.ReactNode;
  testSubj?: string;
  size?: EuiTextProps['size'];
}): React.ReactElement {
  const { labelCss } = useAiButtonGradientStyles({ variant: 'outlined' });
  const { gradientId, colors } = useSvgAiGradient({ variant: 'outlined' });

  return (
    <>
      <SvgAiGradientDefs gradientId={gradientId} colors={colors} />
      <EuiText
        size={size}
        component="span"
        data-test-subj={testSubj}
        css={[
          labelCss,
          css`
            line-height: 1;
            padding: 0;
          `,
        ]}
      >
        {children}
      </EuiText>
    </>
  );
}

function GradientOutlinedStatusBadge({
  label,
  testSubj,
}: {
  label: string;
  testSubj?: string;
}): React.ReactElement {
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
        data-test-subj={testSubj}
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

function InvestigatedStatus({ label }: { label: string }) {
  return <GradientOutlinedStatusBadge label={label} testSubj="nightshiftInvestigatedStatus" />;
}

function InvestigationTerminalFailureStatus({ label }: { label: string }) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiBadge
      color="hollow"
      css={css`
        color: ${euiTheme.colors.textSubdued};
      `}
    >
      {label}
    </EuiBadge>
  );
}

/**
 * Animated "Investigating" badge while the latest investigation is in progress,
 * AI-gradient "Investigated" badge once it has completed. Shared between the
 * event list items and the flyout header. Returns null when the event has no
 * investigations so unresolved/resolved events without runs stay unlabeled.
 */
export function InvestigationStatusBadge({
  event,
  investigationStatus,
}: {
  event: Pick<SignificantEvent, 'investigations'>;
  investigationStatus?: InvestigationStatus;
}): React.ReactElement | null {
  const hasInvestigation = investigationStatus != null || (event.investigations?.length ?? 0) > 0;
  if (!hasInvestigation) {
    return null;
  }

  const latestInvestigation = getLatestInvestigation(event);
  const rememberedTerminalFailure =
    investigationStatus == null && latestInvestigation != null
      ? getRememberedInvestigationTerminalFailure(latestInvestigation.workflow_execution_id)
      : undefined;

  const isInvestigated =
    investigationStatus != null
      ? isInvestigationInvestigated(investigationStatus)
      : rememberedTerminalFailure == null && isEventInvestigated(event);
  const label =
    investigationStatus != null
      ? getInvestigationWorkflowStatusLabel(investigationStatus)
      : rememberedTerminalFailure != null
      ? getInvestigationWorkflowStatusLabel(rememberedTerminalFailure)
      : getInvestigationStatusLabel(event);
  const isTerminalFailure =
    (investigationStatus != null && isInvestigationTerminalFailure(investigationStatus)) ||
    rememberedTerminalFailure != null;

  if (isInvestigated) {
    return <InvestigatedStatus label={label} />;
  }

  if (isTerminalFailure) {
    return <InvestigationTerminalFailureStatus label={label} />;
  }

  return <InvestigatingStatus label={label} />;
}

export {
  GradientOutlinedStatusBadge,
  InvestigationCompleteCheckIcon,
  InvestigationCompleteStatus,
  InvestigationGradientLabel,
  InvestigatingStatusDots,
};
