/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { RiskSeverity } from '../../../../../../common/search_strategy';
import { RISK_SEVERITY_COLOUR } from '../../../../common';
import type { SeverityCount } from '../../../severity/types';

/** Highest severity first so Critical anchors the left edge of the bar. */
const DISPLAY_ORDER: RiskSeverity[] = [
  RiskSeverity.Critical,
  RiskSeverity.High,
  RiskSeverity.Moderate,
  RiskSeverity.Low,
  RiskSeverity.Unknown,
];

const LEVEL_LABELS: Record<RiskSeverity, string> = {
  [RiskSeverity.Critical]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.riskDistributionBar.critical',
    { defaultMessage: 'Critical' }
  ),
  [RiskSeverity.High]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.riskDistributionBar.high',
    { defaultMessage: 'High' }
  ),
  [RiskSeverity.Moderate]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.riskDistributionBar.moderate',
    { defaultMessage: 'Moderate' }
  ),
  [RiskSeverity.Low]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.riskDistributionBar.low',
    { defaultMessage: 'Low' }
  ),
  [RiskSeverity.Unknown]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.riskDistributionBar.unknown',
    { defaultMessage: 'Unknown' }
  ),
};

export interface RiskDistributionBarProps {
  severityCount: SeverityCount;
  activeLevel: RiskSeverity | null;
  onLevelClick: (level: RiskSeverity | null) => void;
  isLoading?: boolean;
}

export const RiskDistributionBar: React.FC<RiskDistributionBarProps> = ({
  severityCount,
  activeLevel,
  onLevelClick,
  isLoading = false,
}) => {
  const { euiTheme } = useEuiTheme();

  const total = DISPLAY_ORDER.reduce((sum, level) => sum + (severityCount[level] ?? 0), 0);
  const hasActive = activeLevel !== null;

  const handleClick = useCallback(
    (level: RiskSeverity) => {
      onLevelClick(activeLevel === level ? null : level);
    },
    [activeLevel, onLevelClick]
  );

  if (isLoading) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
      {/* Total count + label — count large on left, "by risk level" subdued on right */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          alignItems="baseline"
          justifyContent="spaceBetween"
          gutterSize="s"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiText size="m">
              <strong>
                {total}{' '}
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.riskDistributionBar.entities',
                  { defaultMessage: 'entities' }
                )}
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.riskDistributionBar.byRiskLevel',
                { defaultMessage: 'by risk level' }
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Segmented bar — proportional flex segments, clickable */}
      <EuiFlexItem grow={false}>
        <div
          role="group"
          aria-label={i18n.translate(
            'xpack.securitySolution.entityAnalytics.riskDistributionBar.barAriaLabel',
            { defaultMessage: 'Risk level distribution' }
          )}
          css={css`
            display: flex;
            height: 14px;
            border-radius: ${euiTheme.border.radius.medium};
            overflow: hidden;
            gap: 2px;
          `}
        >
          {DISPLAY_ORDER.map((level) => {
            const count = severityCount[level] ?? 0;
            if (!count) return null;
            const isActive = activeLevel === level;
            const dimmed = hasActive && !isActive;
            return (
              <button
                key={level}
                type="button"
                aria-pressed={isActive}
                aria-label={`${LEVEL_LABELS[level]}: ${count}`}
                onClick={() => handleClick(level)}
                css={css`
                  flex: ${count};
                  min-inline-size: 6px;
                  block-size: 100%;
                  background: ${RISK_SEVERITY_COLOUR[level]};
                  border: none;
                  cursor: pointer;
                  padding: 0;
                  outline: none;
                  opacity: ${dimmed ? 0.3 : 1};
                  transition: opacity ${euiTheme.animation.fast} ${euiTheme.animation.resistance};

                  &:hover {
                    opacity: ${dimmed ? 0.55 : 0.75};
                  }
                  &:focus-visible {
                    outline: 2px solid ${euiTheme.colors.borderStrongPrimary};
                    outline-offset: 1px;
                  }
                `}
              />
            );
          })}
        </div>
      </EuiFlexItem>

      {/* Legend — EuiButtonEmpty gives proper hover/focus/active states */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="none" wrap responsive={false}>
          {DISPLAY_ORDER.map((level) => {
            const count = severityCount[level] ?? 0;
            const isActive = activeLevel === level;
            return (
              <EuiFlexItem key={level} grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  color={isActive ? 'primary' : 'text'}
                  onClick={() => handleClick(level)}
                  aria-pressed={isActive}
                  css={css`
                    block-size: auto;
                    padding-block: 0;
                    padding-inline: 4px;
                  `}
                >
                  <EuiHealth color={RISK_SEVERITY_COLOUR[level]} textSize="xs">
                    {LEVEL_LABELS[level]}&nbsp;<strong>{count}</strong>
                  </EuiHealth>
                </EuiButtonEmpty>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
