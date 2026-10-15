/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, type SerializedStyles } from '@emotion/react';
import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  type EuiPanelProps,
  EuiSkeletonTitle,
  EuiText,
  EuiTitle,
  euiShadowHover,
  type UseEuiTheme,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Severity, SeverityCounts } from '@kbn/nightshift-investigations-plugin/common';
import { getSeverityLabel, SEVERITY_OPTIONS } from '@kbn/significant-events-schema';
import { SEVERITY_TILE_ICON, SEVERITY_TILE_ICON_COLORS } from '../common/severity';

/** A muted tier has no section to scroll to, so its tile reads as a figure rather than a control. */
type SeverityTileState = 'muted' | 'interactive';

interface SeverityTileStateStyles {
  /** `EuiPanel`'s `color` prop, since the two states differ in panel fill as well as in CSS. */
  panelColor: EuiPanelProps['color'];
  panel?: SerializedStyles;
  count?: SerializedStyles;
}

interface SeverityIconBoxStyles {
  muted: SerializedStyles;
  interactive: SerializedStyles;
}

/** Every visual difference between a muted and an interactive tile, in one place. */
const getSeverityTileStyles = (
  euiThemeContext: UseEuiTheme
): {
  iconBox: Readonly<Record<Severity, SeverityIconBoxStyles>>;
  iconGlyphRotateUp: SerializedStyles;
  label: SerializedStyles;
  count: SerializedStyles;
  byState: Readonly<Record<SeverityTileState, SeverityTileStateStyles>>;
} => {
  const { euiTheme } = euiThemeContext;
  const iconBoxBase = css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: ${euiTheme.size.xxl};
    height: ${euiTheme.size.xxl};
    border-radius: ${euiTheme.border.radius.control};
  `;

  const iconBox = Object.fromEntries(
    SEVERITY_OPTIONS.map((severity) => {
      const tokens = SEVERITY_TILE_ICON_COLORS[severity];
      return [
        severity,
        {
          muted: css`
            ${iconBoxBase}
            background: ${euiTheme.colors.backgroundBaseSubdued};
            color: ${euiTheme.colors.textDisabled};
          `,
          interactive: css`
            ${iconBoxBase}
            background: ${euiTheme.colors[tokens.background]};
            color: ${euiTheme.colors[tokens.color]};
          `,
        },
      ];
    })
  ) as Record<Severity, SeverityIconBoxStyles>;

  return {
    iconBox,
    iconGlyphRotateUp: css`
      transform: rotate(-90deg);
    `,
    // Match EuiButtonEmpty: medium weight (EuiText has no weight prop).
    label: css`
      font-weight: ${euiTheme.font.weight.medium};
    `,
    // Same stack/weight as Lens metric values (`echMetricText__value` + Elastic UI Numeric).
    count: css`
      font-family: 'Elastic UI Numeric', ${euiTheme.font.family};
      font-weight: ${euiTheme.font.weight.medium};
    `,
    byState: {
      muted: {
        panelColor: 'subdued',
        count: css`
          color: ${euiTheme.colors.textSubdued};
        `,
      },
      // Clickable EuiPanel defaults to hover shadow `m`; use `xs` for a lighter lift.
      interactive: {
        panelColor: undefined,
        panel: css`
          &&:hover,
          &&:focus,
          &&:focus-visible {
            ${euiShadowHover(euiThemeContext, 'xs')}
          }
        `,
      },
    },
  };
};

export interface InvestigationSeverityTilesProps {
  severityCounts: SeverityCounts;
  scrollableSeverities: ReadonlySet<Severity>;
  isLoading: boolean;
  onSeverityClick: (severity: Severity) => void;
}

export const InvestigationSeverityTiles = ({
  severityCounts,
  scrollableSeverities,
  isLoading,
  onSeverityClick,
}: InvestigationSeverityTilesProps): React.ReactElement => {
  const euiThemeContext = useEuiTheme();
  const styles = useMemo(() => getSeverityTileStyles(euiThemeContext), [euiThemeContext]);

  return (
    <EuiFlexGroup gutterSize="m" responsive={false}>
      {SEVERITY_OPTIONS.map((severity) => {
        const count = severityCounts[severity];
        const isMuted = !scrollableSeverities.has(severity);
        const stateStyles = styles.byState[isMuted ? 'muted' : 'interactive'];
        const icon = SEVERITY_TILE_ICON[severity];

        return (
          <EuiFlexItem key={severity}>
            <EuiPanel
              hasBorder
              hasShadow={false}
              paddingSize="m"
              color={stateStyles.panelColor}
              css={stateStyles.panel}
              data-test-subj={`nightshiftSeverityTile-${severity}`}
              onClick={isMuted ? undefined : () => onSeverityClick(severity)}
            >
              <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText color="default" size="xs" css={styles.label}>
                    {getSeverityLabel(severity)}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <span
                        css={styles.iconBox[severity][isMuted ? 'muted' : 'interactive']}
                        aria-hidden={true}
                      >
                        <EuiIcon
                          type={icon.type}
                          size="m"
                          css={icon.rotateUp ? styles.iconGlyphRotateUp : undefined}
                          aria-hidden={true}
                        />
                      </span>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiSkeletonTitle
                        size="l"
                        isLoading={isLoading}
                        contentAriaLabel={i18n.translate(
                          'xpack.nightshift.investigations.severityTileCountAriaLabel',
                          {
                            defaultMessage: '{severityLabel} investigation count',
                            values: { severityLabel: getSeverityLabel(severity) },
                          }
                        )}
                      >
                        <EuiTitle size="l" css={[styles.count, stateStyles.count]}>
                          <span data-test-subj={`nightshiftSeverityTileCount-${severity}`}>
                            {count}
                          </span>
                        </EuiTitle>
                      </EuiSkeletonTitle>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
