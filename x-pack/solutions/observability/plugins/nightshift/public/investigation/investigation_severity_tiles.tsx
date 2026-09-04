/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { Severity, SeverityCounts } from '@kbn/nightshift-investigations-plugin/common';
import { getSeverityLabel, SEVERITY_OPTIONS } from '@kbn/significant-events-schema';

const SEVERITY_DOT_COLOR_KEY: Record<Severity, 'danger' | 'warning' | 'primary' | 'success'> = {
  '80-critical': 'danger',
  '60-high': 'warning',
  '40-medium': 'primary',
  '20-low': 'success',
};

export interface InvestigationSeverityTilesProps {
  severityCounts: SeverityCounts;
  activeSeverity?: Severity;
  onSeverityClick: (severity: Severity) => void;
}

export function InvestigationSeverityTiles({
  severityCounts,
  activeSeverity,
  onSeverityClick,
}: InvestigationSeverityTilesProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      {SEVERITY_OPTIONS.map((severity) => {
        const isActive = severity === activeSeverity;
        const dotColor = euiTheme.colors[SEVERITY_DOT_COLOR_KEY[severity]];
        const count = severityCounts[severity];

        return (
          <EuiFlexItem key={severity}>
            <EuiPanel
              hasBorder
              hasShadow={false}
              paddingSize="m"
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              data-test-subj={`nightshiftSeverityTile-${severity}`}
              onClick={() => onSeverityClick(severity)}
              onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSeverityClick(severity);
                }
              }}
              css={css`
                cursor: pointer;
                outline: ${isActive
                  ? `2px solid ${euiTheme.colors.primary}`
                  : '2px solid transparent'};
                transition: outline 150ms ease;
                &:hover {
                  outline: 2px solid ${euiTheme.colors.primary};
                }
              `}
            >
              <EuiText
                color="subdued"
                size="xs"
                css={css`
                  font-weight: ${euiTheme.font.weight.medium};
                  margin-bottom: ${euiTheme.size.s};
                `}
              >
                {getSeverityLabel(severity)}
              </EuiText>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <span
                    aria-hidden={true}
                    css={css`
                      color: ${dotColor};
                      font-size: ${euiTheme.size.m};
                      line-height: 1;
                    `}
                  >
                    ●
                  </span>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <span data-test-subj={`nightshiftSeverityTileCount-${severity}`}>
                      {count}
                    </span>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
