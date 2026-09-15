/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export interface ConsequenceFunnelStep {
  value: ReactNode;
  label: ReactNode;
  /** Struck-through + muted (e.g. a stage the Worker skipped). */
  skip?: boolean;
  /** Primary-tinted emphasis (e.g. the qualifying stage). */
  accent?: boolean;
  /** Final stage (semantic; no extra chrome beyond the shared card styling). */
  outcome?: boolean;
  /** Focus-link highlight from a related control. */
  highlight?: boolean;
}

interface ConsequenceFunnelProps {
  steps: ConsequenceFunnelStep[];
  'data-test-subj'?: string;
}

/**
 * Consequence-forward funnel visualization ported from the Sep 11 prototype
 * (ConsequenceFunnel.tsx): a row of arrow-linked stage cards showing how a
 * setting change flows through to an outcome. Purely presentational — callers
 * derive `steps` from current settings client-side; this component owns no
 * data of its own.
 *
 * Percentage/flex layout only, no `calc()` interpolation in emotion `css` —
 * the `@elastic/eui/no-css-color` lint rule crashes on that pattern.
 */
export const ConsequenceFunnel: React.FC<ConsequenceFunnelProps> = ({
  steps,
  'data-test-subj': dataTestSubj = 'alertZeroConsequenceFunnel',
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        display: flex;
        align-items: stretch;
        gap: 6px;
        margin-top: 14px;
        margin-bottom: 20px;
      `}
      data-test-subj={dataTestSubj}
    >
      {steps.map((step, index) => (
        <div
          key={index}
          css={css`
            display: contents;
          `}
        >
          {index > 0 ? (
            <span
              aria-hidden="true"
              css={css`
                align-self: center;
                color: ${euiTheme.colors.textSubdued};
                font-size: 12px;
                flex: none;
              `}
            >
              {'\u2192'}
            </span>
          ) : null}
          <div
            css={css`
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;
              justify-content: center;
              line-height: 1.2;
              border-radius: ${euiTheme.border.radius.medium};
              padding: 10px 12px;
              border: 1px solid
                ${step.highlight ? euiTheme.colors.primary : euiTheme.colors.borderBaseSubdued};
              background: ${step.highlight
                ? euiTheme.colors.backgroundLightPrimary
                : euiTheme.colors.backgroundBaseSubdued};
            `}
            data-test-subj={`${dataTestSubj}Step`}
          >
            <span
              css={css`
                font-size: 18px;
                font-weight: ${euiTheme.font.weight.semiBold};
                font-variant-numeric: tabular-nums;
                color: ${step.skip
                  ? euiTheme.colors.textSubdued
                  : step.highlight || step.accent
                  ? euiTheme.colors.textPrimary
                  : euiTheme.colors.textParagraph};
                text-decoration: ${step.skip ? 'line-through' : 'none'};
              `}
            >
              {step.value}
            </span>
            <span
              css={css`
                font-size: 11px;
                color: ${euiTheme.colors.textSubdued};
                margin-top: 2px;
              `}
            >
              {step.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
