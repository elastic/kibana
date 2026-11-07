/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiText, transparentize, useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { RiskLevel } from './common';
import { getRiskLevelColor } from './common';

/** Premium panel: bordered, rounded, subtle top-light gradient. */
export const IntelligencePanel: React.FC<{
  children: React.ReactNode;
  accentColor?: string;
  grow?: boolean;
  'data-test-subj'?: string;
}> = ({ children, accentColor, grow = false, 'data-test-subj': dataTestSubj }) => {
  const { euiTheme } = useEuiTheme();
  const style = css`
    position: relative;
    background: ${euiTheme.colors.emptyShade};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    padding: ${euiTheme.size.base};
    overflow: hidden;
    ${grow ? 'height: 100%;' : ''}

    ${accentColor
      ? `&::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, ${accentColor}, ${transparentize(accentColor, 0.2)});
        }`
      : ''}
  `;
  return (
    <div css={style} data-test-subj={dataTestSubj}>
      {children}
    </div>
  );
};

/** Small uppercase letter-spaced section label. */
export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  const style = css`
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.semiBold};
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${euiTheme.colors.textSubdued};
  `;
  return <div css={style}>{children}</div>;
};

const shimmerAnimation = keyframes`
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`;

/** Animated loading shimmer bars for AI-generation states. */
export const LoadingShimmer: React.FC<{ lines?: number; label?: string }> = ({
  lines = 3,
  label,
}) => {
  const { euiTheme } = useEuiTheme();
  const barStyle = (width: string) => css`
    height: ${euiTheme.size.m};
    width: ${width};
    margin-bottom: ${euiTheme.size.s};
    border-radius: ${euiTheme.border.radius.small};
    background: linear-gradient(
      90deg,
      ${transparentize(euiTheme.colors.primary, 0.06)} 25%,
      ${transparentize(euiTheme.colors.primary, 0.16)} 50%,
      ${transparentize(euiTheme.colors.primary, 0.06)} 75%
    );
    background-size: 800px 100%;
    animation: ${shimmerAnimation} 1.4s linear infinite;
  `;
  const widths = ['100%', '92%', '76%', '84%', '60%'];
  return (
    <div data-test-subj="entityIntelligenceShimmer">
      {label ? (
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            margin-bottom: ${euiTheme.size.s};
          `}
        >
          <p>
            <EuiIcon
              type="sparkles"
              size="s"
              css={css`
                margin-right: ${euiTheme.size.xs};
              `}
              aria-hidden={true}
            />
            {label}
          </p>
        </EuiText>
      ) : null}
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} css={barStyle(widths[index % widths.length])} />
      ))}
    </div>
  );
};

/** Severity-colored pill showing a risk level (and optionally the score). */
export const RiskLevelBadge: React.FC<{ level: RiskLevel; score?: number }> = ({
  level,
  score,
}) => {
  const { euiTheme } = useEuiTheme();
  const color = getRiskLevelColor(euiTheme, level);
  const style = css`
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    padding: 2px ${euiTheme.size.s};
    border-radius: ${euiTheme.border.radius.small};
    background: ${transparentize(color, 0.14)};
    border: ${euiTheme.border.width.thin} solid ${transparentize(color, 0.4)};
    font-size: ${euiTheme.size.m};
    font-weight: ${euiTheme.font.weight.semiBold};
    font-variant-numeric: tabular-nums;
    color: ${euiTheme.colors.textParagraph};
    white-space: nowrap;
  `;
  const dotStyle = css`
    width: ${euiTheme.size.s};
    height: ${euiTheme.size.s};
    border-radius: 50%;
    background: ${color};
  `;
  return (
    <span css={style}>
      <span css={dotStyle} />
      {level}
      {score !== undefined ? <span>{Math.round(score)}</span> : null}
    </span>
  );
};

export const EMPTY_STATE_NO_DATA = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.noDataAvailable',
  { defaultMessage: 'No data available yet' }
);

/** Compact polished empty state for panels with no data. */
export const PanelEmptyState: React.FC<{ message?: string; iconType?: string }> = ({
  message = EMPTY_STATE_NO_DATA,
  iconType = 'folderOpen',
}) => {
  const { euiTheme } = useEuiTheme();
  const style = css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.l} ${euiTheme.size.base};
    text-align: center;
    color: ${euiTheme.colors.textSubdued};
    border: ${euiTheme.border.width.thin} dashed ${euiTheme.colors.borderBasePlain};
    border-radius: ${euiTheme.border.radius.medium};
  `;
  return (
    <div css={style}>
      <EuiIcon type={iconType} size="l" color="subdued" aria-hidden={true} />
      <EuiText size="xs" color="subdued">
        <p>{message}</p>
      </EuiText>
    </div>
  );
};
