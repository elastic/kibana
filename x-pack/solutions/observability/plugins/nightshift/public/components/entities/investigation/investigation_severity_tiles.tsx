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
  EuiSkeletonRectangle,
  EuiText,
  EuiTitle,
  euiShadowHover,
  type UseEuiTheme,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { Severity, SeverityCounts } from '@kbn/nightshift-investigations-plugin/common';
import { getSeverityLabel, SEVERITY_OPTIONS } from '@kbn/significant-events-schema';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { SEVERITY_TILE_ICON, SEVERITY_TILE_ICON_COLORS } from '../../../common/severity';

const LOADING_COUNT_ARIA_LABEL = i18n.translate(
  'xpack.nightshift.investigations.severityTileCountLoadingAriaLabel',
  { defaultMessage: 'Loading count' }
);

/**
 * `muted` — tier never present on the unfiltered page (no fill, grey icon).
 * `present` — tier exists unfiltered but has no scroll target right now (keep fill + colour; no hover).
 * `interactive` — section is on screen; click scrolls to it.
 */
type SeverityTileState = 'muted' | 'present' | 'interactive';

interface SeverityTileStateStyles {
  /** `EuiPanel`'s `color` prop when a state needs a filled panel; omit for border-only. */
  panelColor?: EuiPanelProps['color'];
  panel?: SerializedStyles;
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
  tile: SerializedStyles;
  label: SerializedStyles;
  labelMuted: SerializedStyles;
  count: SerializedStyles;
  countMuted: SerializedStyles;
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
            background: ${euiTheme.colors.backgroundBaseDisabled};
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
    // Four tiles share a row; where they no longer fit, they wrap into a grid instead of
    // overflowing the page.
    tile: css`
      flex: 1 1 calc(${euiTheme.size.xxl} * 3);
      min-width: 0;
    `,
    // Match EuiButtonEmpty: medium weight (EuiText has no weight prop).
    label: css`
      font-weight: ${euiTheme.font.weight.medium};
    `,
    labelMuted: css`
      color: ${euiTheme.colors.textDisabled};
    `,
    // Same stack/weight as Lens metric values (`echMetricText__value` + Elastic UI Numeric).
    count: css`
      font-family: 'Elastic UI Numeric', ${euiTheme.font.family};
      font-weight: ${euiTheme.font.weight.medium};
    `,
    countMuted: css`
      color: ${euiTheme.colors.textDisabled};
    `,
    byState: {
      // Never-present tiles: border only, no panel fill.
      muted: {
        panelColor: 'transparent',
      },
      // Filtered-to-zero but present: keep the plain fill; not clickable.
      present: {},
      // Clickable EuiPanel defaults to hover shadow `m`; use `xs` for a lighter lift.
      interactive: {
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
  /** Severities that have at least one open investigation before search/list filters. */
  presentSeverities: ReadonlySet<Severity>;
  /** Severities whose list section is currently rendered (and can be scrolled to). */
  scrollableSeverities: ReadonlySet<Severity>;
  isLoading: boolean;
  onSeverityClick: (severity: Severity) => void;
}

export const InvestigationSeverityTiles = ({
  severityCounts,
  presentSeverities,
  scrollableSeverities,
  isLoading,
  onSeverityClick,
}: InvestigationSeverityTilesProps): React.ReactElement => {
  const euiThemeContext = useEuiTheme();
  const styles = useMemo(() => getSeverityTileStyles(euiThemeContext), [euiThemeContext]);

  return (
    <EuiFlexGroup gutterSize="m" responsive={false} wrap>
      {SEVERITY_OPTIONS.map((severity) => {
        const count = severityCounts[severity];
        const isPresent = presentSeverities.has(severity);
        const isScrollable = scrollableSeverities.has(severity);
        // Never-present → fully muted. Present but filtered empty → keep fill + colour; zero stays muted.
        const tileState: SeverityTileState = !isPresent
          ? 'muted'
          : isScrollable
          ? 'interactive'
          : 'present';
        const isMuted = tileState === 'muted';
        const stateStyles = styles.byState[tileState];
        const icon = SEVERITY_TILE_ICON[severity];
        const countIsMuted = isMuted || count === 0;

        return (
          <EuiFlexItem key={severity} css={styles.tile}>
            <EuiPanel
              hasBorder
              hasShadow={false}
              paddingSize="m"
              color={stateStyles.panelColor}
              css={stateStyles.panel}
              data-test-subj={`nightshiftSeverityTile-${severity}`}
              data-tile-state={tileState}
              onClick={isScrollable ? () => onSeverityClick(severity) : undefined}
              {...(isScrollable
                ? getEbtProps({
                    action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SEVERITY_INVESTIGATIONS,
                    element: NIGHTSHIFT_EBT_ELEMENTS.SEVERITY_TILES,
                    // The tier is the point of the click; the count rides on the page-view event.
                    detail: severity,
                  })
                : {})}
            >
              <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText
                    color="default"
                    size="xs"
                    css={[styles.label, isMuted ? styles.labelMuted : undefined]}
                  >
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
                    {isLoading ? (
                      <EuiFlexItem>
                        {/* As tall as the icon so the tile does not change height when the count
                            lands. The icon stays: it does not depend on the counts. */}
                        <EuiSkeletonRectangle
                          width="100%"
                          height={euiThemeContext.euiTheme.size.xxl}
                          borderRadius="m"
                          isLoading
                          contentAriaLabel={LOADING_COUNT_ARIA_LABEL}
                          data-test-subj={`nightshiftSeverityTileLoading-${severity}`}
                        />
                      </EuiFlexItem>
                    ) : (
                      <EuiFlexItem grow={false}>
                        <EuiTitle
                          size="l"
                          css={[styles.count, countIsMuted ? styles.countMuted : undefined]}
                        >
                          <span
                            aria-label={i18n.translate(
                              'xpack.nightshift.investigations.severityTileCountAriaLabel',
                              {
                                defaultMessage: '{severityLabel} investigation count: {count}',
                                values: { severityLabel: getSeverityLabel(severity), count },
                              }
                            )}
                            data-test-subj={`nightshiftSeverityTileCount-${severity}`}
                          >
                            {count}
                          </span>
                        </EuiTitle>
                      </EuiFlexItem>
                    )}
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
