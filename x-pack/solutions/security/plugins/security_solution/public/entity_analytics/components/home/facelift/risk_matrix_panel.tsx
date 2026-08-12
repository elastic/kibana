/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPanel, EuiSpacer, EuiText, EuiTitle, transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import type { ActiveFilter, CriticalityTier, FaceliftRiskLevel, PageFilters } from './data';
import {
  CRITICALITY_TIERS,
  CRITICALITY_TIER_LABELS,
  getRiskMatrixCounts,
  RISK_LEVELS,
} from './data';

export interface RiskMatrixPanelProps {
  activeFilter: ActiveFilter | null;
  pageFilters: PageFilters;
  onSelectCell: (riskLevel: FaceliftRiskLevel, tier: CriticalityTier) => void;
}

const riskHue = (
  severity: ReturnType<typeof useEuiTheme>['euiTheme']['colors']['severity'],
  level: FaceliftRiskLevel
): string => {
  switch (level) {
    case 'Critical':
      return severity.danger;
    case 'High':
      return severity.risk;
    case 'Medium':
      return severity.warning;
    case 'Low':
      return severity.neutral;
    case 'Unknown':
    default:
      return severity.unknown;
  }
};

/**
 * Left Overview panel — risk level × asset criticality matrix.
 * Cell intensity scales with count within each risk-level row.
 */
export const RiskMatrixPanel: React.FC<RiskMatrixPanelProps> = ({
  activeFilter,
  pageFilters,
  onSelectCell,
}) => {
  const { euiTheme } = useEuiTheme();
  const matrixCounts = useMemo(() => getRiskMatrixCounts(pageFilters), [pageFilters]);

  const rowLabelWidth = '4.5rem';
  const riskLevelAxisWidth = euiTheme.size.l;

  const styles = useMemo(
    () => ({
      // Fixed column so the rotated title cannot shift the grid.
      riskLevelAxis: css`
        flex: 0 0 ${riskLevelAxisWidth};
        width: ${riskLevelAxisWidth};
        position: relative;
      `,
      riskLevelTitle: css`
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-90deg);
        transform-origin: center center;
        white-space: nowrap;
        font-weight: ${euiTheme.font.weight.medium};
      `,
      criticalityTitleRow: css`
        display: flex;
        align-items: center;
        margin-bottom: ${euiTheme.size.xs};
      `,
      axisSpacer: css`
        flex: 0 0 ${riskLevelAxisWidth};
        width: ${riskLevelAxisWidth};
      `,
      rowLabelSpacer: css`
        flex: 0 0 calc(${rowLabelWidth} + ${euiTheme.size.xs});
        width: calc(${rowLabelWidth} + ${euiTheme.size.xs});
      `,
      criticalityTitle: css`
        flex: 1 1 auto;
        min-width: 0;
        font-weight: ${euiTheme.font.weight.medium};
      `,
      gridRow: css`
        display: flex;
        align-items: stretch;
        gap: ${euiTheme.size.xs};
        min-width: 0;
      `,
      grid: css`
        flex: 1 1 auto;
        min-width: 0;
        display: grid;
        grid-template-columns: ${rowLabelWidth} repeat(${CRITICALITY_TIERS.length}, minmax(0, 1fr));
        gap: ${euiTheme.size.xs};
      `,
      cell: css`
        appearance: none;
        margin: 0;
        border: 0;
        border-radius: ${euiTheme.border.radius.small};
        padding: ${euiTheme.size.m} ${euiTheme.size.xs};
        font: inherit;
        font-weight: ${euiTheme.font.weight.semiBold};
        text-align: center;
        cursor: pointer;
        width: 100%;
        transition: background-color ${euiTheme.animation.fast} ease-in,
          box-shadow ${euiTheme.animation.fast} ease-in;
      `,
      // Nothing to filter to, so the cell reads as inert rather than clickable.
      emptyCell: css`
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
        color: ${euiTheme.colors.textSubdued};
        cursor: default;
      `,
    }),
    [euiTheme, riskLevelAxisWidth, rowLabelWidth]
  );

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="eaFaceliftRiskMatrixPanel">
      <EuiTitle size="s">
        <h3>Entity risk levels</h3>
      </EuiTitle>
      <EuiSpacer size="m" />

      <div css={styles.criticalityTitleRow}>
        <div css={styles.axisSpacer} aria-hidden="true" />
        <div css={styles.rowLabelSpacer} aria-hidden="true" />
        <EuiText size="xs" color="subdued" textAlign="center" css={styles.criticalityTitle}>
          Asset criticality
        </EuiText>
      </div>

      <div css={styles.gridRow}>
        <div css={styles.riskLevelAxis} aria-hidden="true">
          <EuiText size="xs" color="subdued" css={styles.riskLevelTitle}>
            Risk level
          </EuiText>
        </div>

        <div css={styles.grid} role="grid" aria-label="Entity risk levels by asset criticality">
          <div role="columnheader" />
          {CRITICALITY_TIERS.map((tier) => (
            <EuiText key={tier} size="xs" color="subdued" textAlign="center" role="columnheader">
              {CRITICALITY_TIER_LABELS[tier]}
            </EuiText>
          ))}

          {RISK_LEVELS.map((level) => {
            const counts = matrixCounts[level];
            const maxInRow = Math.max(...CRITICALITY_TIERS.map((tier) => counts[tier]), 1);
            const hue = riskHue(euiTheme.colors.severity, level);

            return (
              <React.Fragment key={level}>
                <EuiText
                  size="xs"
                  color="subdued"
                  role="rowheader"
                  css={css`
                    align-self: center;
                  `}
                >
                  {level}
                </EuiText>
                {CRITICALITY_TIERS.map((tier) => {
                  const count = counts[tier];
                  const selected =
                    activeFilter?.type === 'matrix' &&
                    activeFilter.riskLevel === level &&
                    activeFilter.tier === tier;
                  const fill = 0.12 + (count / maxInRow) * 0.7;

                  return (
                    <button
                      key={`${level}-${tier}`}
                      type="button"
                      role="gridcell"
                      disabled={count === 0}
                      aria-pressed={selected}
                      aria-label={`${count} entities: ${level} risk, ${CRITICALITY_TIER_LABELS[tier]}`}
                      onClick={() => onSelectCell(level, tier)}
                      css={[
                        styles.cell,
                        count === 0
                          ? styles.emptyCell
                          : css`
                              background-color: ${transparentize(hue, fill)};
                              box-shadow: ${selected
                                ? `inset 0 0 0 2px ${euiTheme.colors.primary}`
                                : 'none'};

                              &:hover,
                              &:focus-visible {
                                background-color: ${transparentize(
                                  hue,
                                  Math.min(fill + 0.18, 0.95)
                                )};
                                box-shadow: inset 0 0 0 ${selected ? '2px' : '1px'}
                                  ${euiTheme.colors.primary};
                              }
                            `,
                      ]}
                    >
                      {count.toLocaleString()}
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </EuiPanel>
  );
};
