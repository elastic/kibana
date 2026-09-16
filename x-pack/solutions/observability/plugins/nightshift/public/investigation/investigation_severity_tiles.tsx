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
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { Severity, SeverityCounts } from '@kbn/nightshift-investigations-plugin/common';
import { getSeverityLabel, SEVERITY_OPTIONS } from '@kbn/significant-events-schema';
import { SEVERITY_DOT_COLOR } from '../common/severity';

export interface InvestigationSeverityTilesProps {
  severityCounts: SeverityCounts;
  onSeverityClick: (severity: Severity) => void;
}

export const InvestigationSeverityTiles = ({
  severityCounts,
  onSeverityClick,
}: InvestigationSeverityTilesProps): React.ReactElement => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup gutterSize="s" responsive={false}>
      {SEVERITY_OPTIONS.map((severity) => {
        const count = severityCounts[severity];
        // Nothing to scroll to when a tier is empty, since its section is hidden.
        const isMuted = count === 0;

        return (
          <EuiFlexItem key={severity}>
            <EuiPanel
              hasBorder
              hasShadow={false}
              paddingSize="m"
              color={isMuted ? 'subdued' : undefined}
              data-test-subj={`nightshiftSeverityTile-${severity}`}
              onClick={isMuted ? undefined : () => onSeverityClick(severity)}
              css={
                isMuted
                  ? undefined
                  : css`
                      text-align: left;
                      outline: ${euiTheme.border.width.thick} solid transparent;
                      transition: outline ${euiTheme.animation.fast} ease;
                      &:hover {
                        outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
                      }
                    `
              }
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
                  <EuiIcon type="dot" color={SEVERITY_DOT_COLOR[severity]} aria-hidden={true} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle
                    size="s"
                    css={
                      isMuted
                        ? css`
                            color: ${euiTheme.colors.textSubdued};
                          `
                        : undefined
                    }
                  >
                    <span data-test-subj={`nightshiftSeverityTileCount-${severity}`}>{count}</span>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
