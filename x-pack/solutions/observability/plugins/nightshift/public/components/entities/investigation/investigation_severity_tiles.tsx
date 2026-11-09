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
  EuiNotificationBadge,
  EuiPanel,
  type EuiPanelProps,
  EuiSkeletonTitle,
  EuiText,
  EuiTitle,
  EuiToolTip,
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

/** Owned class for primary fill — EuiNotificationBadge has no public `primary` color. */
const FRESH_BADGE_CLASS_NAME = 'nightshiftSeverityTileFreshBadge';

/** A muted tier has no section to scroll to, so its tile reads as a figure rather than a control. */
type SeverityTileState = 'muted' | 'interactive';

interface SeverityTileStateStyles {
  /** `EuiPanel`'s `color` prop when a state needs a filled panel; omit for border-only. */
  panelColor?: EuiPanelProps['color'];
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
  countWithFresh: SerializedStyles;
  freshBadgeAnchor: SerializedStyles;
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
    // Match EuiButtonEmpty: medium weight (EuiText has no weight prop).
    label: css`
      font-weight: ${euiTheme.font.weight.medium};
    `,
    // Same stack/weight as Lens metric values (`echMetricText__value` + Elastic UI Numeric).
    // Passed as EuiTitle's `css` (replaces size styles) — same pattern as before the badge work.
    count: css`
      font-family: 'Elastic UI Numeric', ${euiTheme.font.family};
      font-weight: ${euiTheme.font.weight.medium};
    `,
    countWithFresh: css`
      position: relative;
      display: inline-flex;
      align-items: flex-start;
      min-width: 0;
    `,
    // Position only — never pass `css` to EuiNotificationBadge (it replaces, not merges).
    // Primary fill via our own class (EUI has no primary color on this component).
    freshBadgeAnchor: css`
      position: absolute;
      top: 0;
      left: 100%;
      margin-inline-start: ${euiTheme.size.xs};
      transform: translateY(-15%);
      flex-shrink: 0;

      & .${FRESH_BADGE_CLASS_NAME} {
        background-color: ${euiTheme.colors.backgroundFilledPrimary};
        color: ${euiTheme.colors.textInverse};
      }
    `,
    byState: {
      // Empty tiles: border only, no panel fill; count/icon stay muted.
      muted: {
        panelColor: 'transparent',
        count: css`
          color: ${euiTheme.colors.textDisabled};
        `,
      },
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
  /** Unread manually finished investigations per severity — shown as a `+N` badge. */
  freshCounts?: SeverityCounts;
  scrollableSeverities: ReadonlySet<Severity>;
  isLoading: boolean;
  onSeverityClick: (severity: Severity) => void;
}

const EMPTY_FRESH_COUNTS: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };

export const InvestigationSeverityTiles = ({
  severityCounts,
  freshCounts = EMPTY_FRESH_COUNTS,
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
        const freshCount = isMuted ? 0 : freshCounts[severity];
        const showFreshBadge = freshCount > 0;
        const freshBadgeLabel = `+${freshCount}`;
        const stateStyles = styles.byState[isMuted ? 'muted' : 'interactive'];
        const icon = SEVERITY_TILE_ICON[severity];
        const countAriaLabel = i18n.translate(
          'xpack.nightshift.investigations.severityTileCountAriaLabel',
          {
            defaultMessage: '{severityLabel} investigation count',
            values: { severityLabel: getSeverityLabel(severity) },
          }
        );
        const freshBadgeTooltip =
          freshCount === 1
            ? i18n.translate('xpack.nightshift.investigations.severityTileFreshBadgeOne', {
                defaultMessage: '1 new investigation result',
              })
            : i18n.translate('xpack.nightshift.investigations.severityTileFreshBadgeMany', {
                defaultMessage: '{freshCount} new investigation results',
                values: { freshCount },
              });

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
              {...(isMuted
                ? {}
                : getEbtProps({
                    action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SEVERITY_INVESTIGATIONS,
                    element: NIGHTSHIFT_EBT_ELEMENTS.SEVERITY_TILES,
                    // The tier is the point of the click; the count rides on the page-view event.
                    detail: severity,
                  }))}
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
                      {/*
                        Badge stays a sibling of the title (not inside EuiTitle / SkeletonTitle)
                        so count Numeric styles cannot leak into EuiNotificationBadge type.
                      */}
                      <span css={showFreshBadge ? styles.countWithFresh : undefined}>
                        <EuiSkeletonTitle
                          size="l"
                          isLoading={isLoading}
                          contentAriaLabel={
                            showFreshBadge
                              ? `${countAriaLabel}, ${freshBadgeLabel}`
                              : countAriaLabel
                          }
                        >
                          <EuiTitle size="l" css={[styles.count, stateStyles.count]}>
                            <span data-test-subj={`nightshiftSeverityTileCount-${severity}`}>
                              {count}
                            </span>
                          </EuiTitle>
                        </EuiSkeletonTitle>
                        {showFreshBadge ? (
                          <span css={styles.freshBadgeAnchor}>
                            <EuiToolTip content={freshBadgeTooltip} position="top">
                              <EuiNotificationBadge
                                className={FRESH_BADGE_CLASS_NAME}
                                size="s"
                                data-test-subj={`nightshiftSeverityTileFreshBadge-${severity}`}
                              >
                                {freshBadgeLabel}
                              </EuiNotificationBadge>
                            </EuiToolTip>
                          </span>
                        ) : null}
                      </span>
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
