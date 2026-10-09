/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, keyframes } from '@emotion/react';
import React from 'react';
import { EuiButtonEmpty, EuiIcon, useEuiTheme } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';

interface NightshiftEmptyStateProps {
  isProcessing: boolean;
  logsHref: string;
}

const processingSteps = [
  {
    icon: 'productStreamsWired',
    label: i18n.translate('xpack.nightshift.emptyState.streamsStepLabel', {
      defaultMessage: 'Streams',
    }),
  },
  {
    icon: 'analyzeEvent',
    label: i18n.translate('xpack.nightshift.emptyState.entitiesStepLabel', {
      defaultMessage: 'Entities',
    }),
  },
  {
    icon: 'radar',
    label: i18n.translate('xpack.nightshift.emptyState.detectionsStepLabel', {
      defaultMessage: 'Detections',
    }),
  },
] as const;

const createFillProgress = (index: number) => {
  const fillStart = index * 10;
  const fillEnd = fillStart + 10;
  const clearStart = 50 + index * 10;
  const clearEnd = clearStart + 10;

  return keyframes`
  0%, ${fillStart}% {
    transform: scaleX(0);
    transform-origin: left;
  }
  ${fillEnd}% {
    transform: scaleX(1);
    transform-origin: left;
  }
  ${clearStart}% {
    transform: scaleX(1);
    transform-origin: right;
  }
  ${clearEnd}%, 100% {
    transform: scaleX(0);
    transform-origin: right;
  }
`;
};

const fillProgressAnimations = Array.from({ length: 5 }, (_, index) => createFillProgress(index));

export function NightshiftEmptyState({
  isProcessing,
  logsHref,
}: NightshiftEmptyStateProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const progressGradient = `linear-gradient(
    90deg,
    ${euiTheme.colors.backgroundFilledAssistance},
    ${euiTheme.colors.backgroundFilledPrimary}
  )`;

  const progressSegmentCss = (index: number) => css`
    background: ${euiTheme.colors.borderBaseSubdued};
    overflow: hidden;
    position: relative;

    &::before {
      animation: ${fillProgressAnimations[index]} 5s linear infinite;
      background: ${progressGradient};
      content: '';
      inset: 0;
      position: absolute;
      transform: scaleX(0);
      transform-origin: left;
    }

    @media (prefers-reduced-motion: reduce) {
      &::before {
        animation: none;
        transform: scaleX(0.45);
      }
    }
  `;

  return (
    <div
      css={css`
        align-items: center;
        display: flex;
        flex-direction: column;
        gap: calc(${euiTheme.size.m} + ${euiTheme.size.base});
        max-width: 100%;
        width: 490px;
      `}
    >
      <div
        aria-busy={isProcessing}
        aria-label={
          isProcessing
            ? i18n.translate('xpack.nightshift.emptyState.processingStepsAriaLabel', {
                defaultMessage: 'Checking streams, entities, and detections',
              })
            : i18n.translate('xpack.nightshift.emptyState.completedStepsAriaLabel', {
                defaultMessage: 'Streams, entities, and detections checked',
              })
        }
        role="group"
        css={css`
          align-items: center;
          display: flex;
          justify-content: center;
          width: 100%;
        `}
      >
        {processingSteps.map(({ icon, label }, index) => (
          <React.Fragment key={label}>
            {index > 0 && (
              <div
                aria-hidden={true}
                css={[
                  progressSegmentCss(index * 2 - 1),
                  css`
                    border-radius: ${euiTheme.border.radius.small};
                    flex: 1 1 50px;
                    height: ${euiTheme.border.width.thick};
                    min-width: ${euiTheme.size.s};
                  `,
                ]}
              />
            )}
            <div
              css={[
                progressSegmentCss(index * 2),
                css`
                  border-radius: ${euiTheme.size.xxl};
                  box-sizing: border-box;
                  flex: 0 1 130px;
                  height: ${euiTheme.size.xxl};
                  padding: ${euiTheme.border.width.thick};
                `,
              ]}
            >
              <div
                css={css`
                  align-items: center;
                  background: ${euiTheme.colors.backgroundBasePlain};
                  border-radius: ${euiTheme.size.xxl};
                  display: flex;
                  gap: ${euiTheme.size.s};
                  height: 100%;
                  padding: 0 ${euiTheme.size.base};
                  position: relative;
                  white-space: nowrap;
                  z-index: 1;
                `}
              >
                <EuiIcon aria-hidden={true} type={icon} size="m" />
                <span>{label}</span>
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      <EuiButtonEmpty
        data-test-subj="nightshiftEmptyStateLogsLink"
        href={logsHref}
        {...getEbtProps({
          action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SIGNIFICANT_EVENTS,
          element: NIGHTSHIFT_EBT_ELEMENTS.PAGE_HEADER,
        })}
      >
        {i18n.translate('xpack.nightshift.emptyState.logsLinkLabel', {
          defaultMessage: 'What do we know about your logs?',
        })}
      </EuiButtonEmpty>
    </div>
  );
}
