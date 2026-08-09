/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { ActiveFilter, CriticalityTier, FaceliftRiskLevel } from './data';
import {
  CRITICALITY_TIERS,
  CRITICALITY_TIER_LABELS,
  RISK_LEVELS,
  RISK_MATRIX_COUNTS,
} from './data';

export interface RiskMatrixPanelProps {
  activeFilter: ActiveFilter | null;
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
  onSelectCell,
}) => {
  const { euiTheme } = useEuiTheme();

  const styles = useMemo(
    () => ({
      grid: css`
        display: grid;
        grid-template-columns: 4.5rem repeat(${CRITICALITY_TIERS.length}, minmax(0, 1fr));
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
      `,
    }),
    [euiTheme]
  );

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="eaFaceliftRiskMatrixPanel">
      <EuiTitle size="xs">
        <h3>Entity risk levels</h3>
      </EuiTitle>
      <EuiSpacer size="m" />

      <div css={styles.grid} role="grid" aria-label="Entity risk levels by asset criticality">
        <div role="columnheader" />
        {CRITICALITY_TIERS.map((tier) => (
          <EuiText key={tier} size="xs" color="subdued" textAlign="center" role="columnheader">
            {CRITICALITY_TIER_LABELS[tier]}
          </EuiText>
        ))}

        {RISK_LEVELS.map((level) => {
          const counts = RISK_MATRIX_COUNTS[level];
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

                return (
                  <button
                    key={`${level}-${tier}`}
                    type="button"
                    role="gridcell"
                    aria-pressed={selected}
                    aria-label={`${count} entities: ${level} risk, ${CRITICALITY_TIER_LABELS[tier]}`}
                    onClick={() => onSelectCell(level, tier)}
                    css={[
                      styles.cell,
                      css`
                        background-color: ${transparentize(hue, 0.12 + (count / maxInRow) * 0.7)};
                        box-shadow: ${selected
                          ? `inset 0 0 0 2px ${euiTheme.colors.primary}`
                          : 'none'};
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
    </EuiPanel>
  );
};
