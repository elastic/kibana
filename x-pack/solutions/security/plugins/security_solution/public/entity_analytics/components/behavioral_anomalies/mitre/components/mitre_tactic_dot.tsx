/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Single MITRE tactic dot rendered inside `MitreAttackChain`. Visual pattern
 * mirrors Attack discovery's `Tactic`: an inner circle, a faded outer halo
 * when detected, and a horizontal axis line that fills the rest of the cell
 * to chain consecutive dots into a single line.
 *
 * Unlike Attack discovery's fixed 144px-per-tactic layout, this dot stretches
 * with its parent (driven by flex), so 15 tactics can be packed into a narrow
 * right-panel container without horizontal scrolling.
 *
 * Cleanup: deleted with the rest of the `mitre/` folder.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

// Layout constants for the hover chip area rendered above each dot.
// Sized to match the joined `EuiBadge color="hollow"` pill used by the
// Insights > Alerts severity DistributionBar.
const CHIP_ROW_HEIGHT = 28;
const TICK_HEIGHT = 6;
const CHIP_TICK_GAP = 2;

const clearFilterAriaLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.mitre.clearFilterAriaLabel',
  { defaultMessage: 'Clear tactic filter' }
);

interface MitreTacticDotProps {
  /** Display name of the tactic (e.g. "Initial Access"). */
  tactic: string;
  /** Whether the tactic was triggered for the entity (drives color + halo). */
  detected: boolean;
  /** Whether to render the label below the dot. */
  showLabel: boolean;
  /**
   * Last dot in the chain — when true, the connector line stops at the dot
   * center instead of running to the right edge of the cell. Mid-chain dots
   * keep their full-width line so adjacent cells stitch into a single line.
   */
  isLast?: boolean;
  /**
   * When provided, the dot row is wrapped in a tooltip that surfaces the
   * tactic name + a short "<N> anomalies" line, matching the styling of
   * `@elastic/charts` tooltips. Pass `undefined` to disable the dot tooltip
   * entirely (the label tooltip stays).
   */
  anomalyCount?: number;
  /**
   * Currently selected as the tab-level tactic filter. Renders the halo at
   * full opacity and slightly larger so the selection reads against the rest
   * of the chain. Independent of `detected` — a selected dot stays styled
   * even if a time-range change makes its tactic non-triggered.
   */
  isSelected?: boolean;
  /**
   * When true (and `onClick` is provided), the column becomes a button:
   * `cursor: pointer`, keyboard-accessible (Enter / Space), and announced as
   * a button. Caller is expected to only pass this for triggered dots — the
   * grayed-out tactics stay non-interactive per the design.
   */
  isClickable?: boolean;
  /** Click / keyboard activation handler (only fires when `isClickable`). */
  onClick?: () => void;
  /** Suffix for `data-test-subj` attributes. */
  testSubjId?: string;
}

const anomaliesCountText = (count: number): string =>
  i18n.translate(
    'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV2.mitre.anomalyCountTooltip',
    {
      defaultMessage:
        '{count, plural, one {# anomaly} other {# anomalies}}',
      values: { count },
    }
  );

export const MitreTacticDot: React.FC<MitreTacticDotProps> = ({
  tactic,
  detected,
  showLabel,
  isLast = false,
  anomalyCount,
  isSelected = false,
  isClickable = false,
  onClick,
  testSubjId,
}) => {
  const { euiTheme } = useEuiTheme();
  const color = detected ? euiTheme.colors.danger : euiTheme.colors.subduedText;
  const dotTestSubj = testSubjId ? `mitreTacticDot-${testSubjId}` : 'mitreTacticDot';

  // Selected halo: grows from 16x16 (left/top -4px) to 20x20 (left/top -6px)
  // and goes from 25% to 100% opacity. Non-selected detected dots keep the
  // 25% halo; non-detected dots have no halo (opacity 0).
  const haloOpacity = isSelected ? 1 : detected ? 0.25 : 0;
  const haloSize = isSelected ? 20 : 16;
  const haloOffset = isSelected ? -6 : -4;

  const handleActivate = isClickable && onClick ? onClick : undefined;

  // Hover chip — mirrors the `DistributionBar` pattern used in the entity
  // flyout > Insights > Alerts severity distribution: two adjacent hollow
  // EuiBadges joined into one pill ([count][● label]) plus a 1×6 tick that
  // anchors the chip to the dot, exactly like the alerts version's stroke
  // above each severity slice.
  const showHoverChip = typeof anomalyCount === 'number';

  // JS-state hover (not CSS :hover) so the cursor can travel between the
  // dot and the chip through their shared parent. mouseenter/leave on the
  // wrapper fire as the cursor moves over any descendant — including the
  // chip — and the chip-row is rendered as a sibling of the dot in normal
  // flow, so there is no empty gap that breaks the hover bridge.
  const [isHovered, setIsHovered] = useState(false);
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  // Visibility rule mirrors DistributionBar: show on hover and while the
  // dot is the active filter.
  const isChipVisible = showHoverChip && (isHovered || isSelected);

  const handleChipClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleActivate?.();
    },
    [handleActivate]
  );

  const handleCrossClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      // `handleActivate` toggles selection — when the dot is already
      // selected, calling it again clears the filter, which is the cross
      // icon's role per the alerts pattern.
      handleActivate?.();
    },
    [handleActivate]
  );

  const dotRow = (
    <div
      css={css`
        position: relative;
        height: 8px;
      `}
    >
      {/* Inner circle — filled with the EUI Backgrounds/Base/Plain token
          (`#fff` in light mode / dark-mode equivalent) so the dot reads as
          a solid, theme-aware shape against the chain's stroke instead of
          letting the panel show through. Border keeps the state color. */}
      <div
        data-test-subj="mitreInnerCircle"
        css={css`
          position: absolute;
          left: 0;
          top: 0;
          width: 8px;
          height: 8px;
          background: ${euiTheme.colors.backgroundBasePlain};
          border: 2px solid ${color};
          border-radius: 50%;
          z-index: 2;
        `}
      />
      {/* Outer halo — only fully visible when detected; expands + 100% opacity when selected. */}
      <div
        data-test-subj="mitreOuterCircle"
        css={css`
          position: absolute;
          left: ${haloOffset}px;
          top: ${haloOffset}px;
          width: ${haloSize}px;
          height: ${haloSize}px;
          background: transparent;
          border: 2px solid ${color};
          border-radius: 50%;
          opacity: ${haloOpacity};
          z-index: 1;
          transition: width 120ms ease, height 120ms ease, opacity 120ms ease, left 120ms ease,
            top 120ms ease;
        `}
      />
      {/* Connector line. For the last dot we render only a 4px stub so the
          chain visually terminates at the dot center; mid-chain dots fill
          the whole cell so consecutive cells join into one continuous line. */}
      <div
        css={
          isLast
            ? css`
                position: absolute;
                left: 0;
                width: 4px;
                top: 3px;
                border-bottom: 1px solid ${euiTheme.colors.lightShade};
                height: 0;
              `
            : css`
                position: absolute;
                left: 0;
                right: 0;
                top: 3px;
                border-bottom: 1px solid ${euiTheme.colors.lightShade};
                height: 0;
              `
        }
      />
    </div>
  );

  // ARIA description that mirrors the visible chip content for assistive
  // tech consuming the dot button.
  const chipAriaLabel = showHoverChip
    ? `${tactic}, ${anomaliesCountText(anomalyCount as number)}`
    : undefined;

  // Chip row sits as a sibling of the dot in normal flow (not absolute-
  // positioned outside the wrapper) so there is a continuous DOM hover
  // surface from the dot up into the chip area — the cursor never crosses
  // an untracked gap, which is what made the old chip disappear mid-hover.
  const chipRow = showHoverChip ? (
    <div
      css={css`
        position: relative;
        height: ${CHIP_ROW_HEIGHT}px;
        width: 100%;
      `}
    >
      {/* Tick stroke connecting the chip to the dot. Centered on the dot
          (4px = half of the 8px dot). Matches the DistributionBar tick
          above each severity slice. */}
      <div
        aria-hidden
        css={css`
          position: absolute;
          left: 4px;
          bottom: 0;
          width: 1px;
          height: ${TICK_HEIGHT}px;
          background: ${euiTheme.colors.lightShade};
          opacity: ${isChipVisible ? 1 : 0};
          transition: opacity 120ms ease;
          z-index: 3;
          pointer-events: none;
        `}
      />
      {/* The chip itself — right edge anchored to the dot center / tick so
          the chip grows leftward from the tactic dot. Per design: the chip
          sits to the LEFT of the tactic, with its right edge sharing the
          vertical line of the stroke (4px) and the 8px dot below.
          `pointer-events: auto` only while visible so it never intercepts
          clicks on neighbouring cells. */}
      <div
        role={handleActivate ? 'button' : undefined}
        aria-label={chipAriaLabel}
        onClick={handleActivate ? handleChipClick : undefined}
        className="mitreTacticDot__hoverChip"
        data-test-subj={
          testSubjId ? `mitreTacticDotHoverChip-${testSubjId}` : 'mitreTacticDotHoverChip'
        }
        css={css`
          position: absolute;
          right: calc(100% - 4px);
          bottom: ${TICK_HEIGHT + CHIP_TICK_GAP}px;
          opacity: ${isChipVisible ? 1 : 0};
          pointer-events: ${isChipVisible ? 'auto' : 'none'};
          cursor: ${handleActivate ? 'pointer' : 'default'};
          transition: opacity 120ms ease;
          white-space: nowrap;
          /* Hovered chip floats above the persistently-visible "selected"
             chip so it never gets buried by the active filter. Both chips
             extend leftward from their dot, so when the user hovers a
             tactic to the right of the selected one the two chips overlap
             — the hovered one must win z-order. */
          z-index: ${isHovered ? 5 : 4};
        `}
      >
        <EuiFlexGroup gutterSize="none" responsive={false} alignItems="center" wrap={false}>
          <EuiFlexItem grow={false}>
            {/* Left half of the joined pill: anomaly count. */}
            <EuiBadge
              color="hollow"
              css={css`
                border-top-right-radius: 0;
                border-bottom-right-radius: 0;
              `}
            >
              {anomalyCount}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {/* Right half: tactic name, plus a clear-filter cross when this
                dot is the active filter (mirrors DistributionBar's
                `stat.isCurrentFilter && stat.reset`). The state-color dot
                was removed from this chip per design — the chip background
                is the only visual the chain needed it for. */}
            <EuiBadge
              color="hollow"
              css={css`
                border-top-left-radius: 0;
                border-bottom-left-radius: 0;
                border-left: none;
              `}
            >
              {isSelected && handleActivate ? (
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>{tactic}</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiIcon
                      type="cross"
                      size="s"
                      onClick={handleCrossClick}
                      aria-label={clearFilterAriaLabel}
                      data-test-subj={
                        testSubjId
                          ? `mitreTacticDotHoverChipClear-${testSubjId}`
                          : 'mitreTacticDotHoverChipClear'
                      }
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : (
                tactic
              )}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  ) : null;

  // The dot column becomes a button-like target when the parent enables
  // click-to-filter. Native `<button>` styling would inject browser defaults
  // (background, padding, focus ring) that fight the dot layout, so we use a
  // div with `role="button"` and our own focus-visible outline.
  const interactiveProps = handleActivate
    ? {
        role: 'button' as const,
        tabIndex: 0,
        'aria-pressed': isSelected,
        'aria-label': chipAriaLabel ?? tactic,
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          handleActivate();
        },
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            handleActivate();
          }
        },
      }
    : {};

  // Cursor + focus outline only apply when the dot is interactive. The
  // outline uses focus-visible so mouse-click selection stays clean.
  const interactiveCss = handleActivate
    ? css`
        cursor: pointer;
        &:focus-visible {
          outline: 2px solid ${euiTheme.colors.primary};
          outline-offset: 2px;
          border-radius: 4px;
        }
      `
    : css`
        cursor: default;
      `;

  const wrapperCss = css`
    position: relative;
    width: 100%;
    ${interactiveCss};
  `;

  return (
    <div
      data-test-subj={dotTestSubj}
      onMouseEnter={showHoverChip ? handleMouseEnter : undefined}
      onMouseLeave={showHoverChip ? handleMouseLeave : undefined}
      onFocus={showHoverChip ? handleMouseEnter : undefined}
      onBlur={showHoverChip ? handleMouseLeave : undefined}
      css={wrapperCss}
      {...interactiveProps}
    >
      {chipRow}
      {dotRow}
      {showLabel && (
        <div
          css={css`
            margin-top: ${euiTheme.size.s};
            min-width: 0;
          `}
        >
          <EuiToolTip
            content={tactic}
            anchorProps={{
              css: css`
                display: block;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              `,
            }}
          >
            <EuiText
              size="xs"
              color={detected ? 'danger' : 'subdued'}
              css={css`
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                display: block;
                ${isSelected ? 'font-weight: 600;' : ''}
              `}
            >
              <span>{tactic}</span>
            </EuiText>
          </EuiToolTip>
        </div>
      )}
    </div>
  );
};
