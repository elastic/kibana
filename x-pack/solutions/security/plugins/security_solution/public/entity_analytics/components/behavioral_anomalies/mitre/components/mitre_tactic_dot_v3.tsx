/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Prototype "v.3" copy of `MitreTacticDot`. Forked from the v.2 version so
 * the two prototypes can evolve independently and v.2 stays a snapshot of
 * the earlier iteration. v.3-specific deltas vs v.2:
 *
 *  - No tooltip on the tactic name label (the inline truncation + the hover
 *    chip already surface the full name).
 *  - 8 px horizontal breathing room between adjacent tactic labels.
 *  - Smart hover-chip alignment: by default the chip extends RIGHTWARD from
 *    the dot (`left: 4px`); for dots near the END of the chain — where the
 *    left-aligned chip would extend past the container's RIGHT edge — the
 *    chip flips to LEFT-extending (`right: calc(100% - 4px)`) so it stays
 *    fully visible.
 *
 * The chip width / dot center / container bounds are measured at mount, on
 * every container resize (ResizeObserver — catches flyout open animations /
 * responsive width changes that finalize after mount), and on mouseenter
 * as a belt-and-suspenders safety net. Measurement is alignment-agnostic
 * (computed from the dot center + chip width, not the chip's current
 * bounding rect) so re-measuring after a flip can't bounce the chip back.
 *
 * Cleanup: deletes with the rest of the BA-v.3 prototype — see
 * `behavioral_anomalies_overview_v3.tsx` cleanup notes.
 */

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
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

const clearFilterAriaLabelV3 = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.mitre.clearFilterAriaLabel',
  { defaultMessage: 'Clear tactic filter' }
);

interface MitreTacticDotV3Props {
  /** Display name of the tactic (e.g. "Initial Access"). */
  tactic: string;
  /** Whether the tactic was triggered for the entity (drives color + halo). */
  detected: boolean;
  /** Whether to render the label below the dot. */
  showLabel: boolean;
  /**
   * Last dot in the chain — when true, the connector line stops at the dot
   * center instead of running to the right edge of the cell.
   */
  isLast?: boolean;
  /**
   * When provided, the dot row is wrapped in a hover chip ([count][name])
   * matching the alerts DistributionBar styling. Pass `undefined` to
   * disable the chip entirely.
   */
  anomalyCount?: number;
  /**
   * Currently selected as the tab-level tactic filter. Renders the halo at
   * full opacity and slightly larger so the selection reads against the rest
   * of the chain.
   */
  isSelected?: boolean;
  /** When true (and `onClick` is provided), the column becomes keyboard-accessible. */
  isClickable?: boolean;
  /** Click / keyboard activation handler (only fires when `isClickable`). */
  onClick?: () => void;
  /** Suffix for `data-test-subj` attributes. */
  testSubjId?: string;
  /**
   * Ref to the enclosing chain container — used to detect whether the
   * default LEFT-extending hover chip would extend past the container's
   * RIGHT edge (a problem for the last few dots in the chain). When it
   * would, the chip is flipped so it grows leftward from the dot and
   * stays fully visible. Pass `null` to keep the default unconditionally.
   */
  containerRef?: React.RefObject<HTMLElement | null>;
  /**
   * When true, the chip is shown persistently (without requiring hover)
   * so long as no other dot in the chain is being hovered. Used by the
   * chain to surface the first active tactic by default. Setting this
   * has no effect when `anomalyCount` is undefined (no chip to show).
   */
  isPersistentDefault?: boolean;
  /**
   * Set by the chain when a DIFFERENT dot is currently being hovered.
   * Drives the suppression of `isPersistentDefault` — the persistent
   * chip disappears while the user is pointing at another tactic and
   * reappears once the cursor leaves all dots.
   */
  isAnotherDotHovered?: boolean;
  /**
   * Notifies the chain when this dot's hover state changes so the chain
   * can keep `isAnotherDotHovered` in sync across siblings.
   */
  onHoverChange?: (tactic: string, isHovered: boolean) => void;
}

const anomaliesCountTextV3 = (count: number): string =>
  i18n.translate(
    'xpack.securitySolution.entityAnalytics.behavioralAnomaliesV3.mitre.anomalyCountTooltip',
    {
      defaultMessage: '{count, plural, one {# anomaly} other {# anomalies}}',
      values: { count },
    }
  );

export const MitreTacticDotV3: React.FC<MitreTacticDotV3Props> = ({
  tactic,
  detected,
  showLabel,
  isLast = false,
  anomalyCount,
  isSelected = false,
  isClickable = false,
  onClick,
  testSubjId,
  containerRef,
  isPersistentDefault = false,
  isAnotherDotHovered = false,
  onHoverChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const color = detected ? euiTheme.colors.danger : euiTheme.colors.subduedText;
  const dotTestSubj = testSubjId ? `mitreTacticDotV3-${testSubjId}` : 'mitreTacticDotV3';

  // JS-state hover so the cursor can travel from dot → chip through their
  // shared parent without breaking the hover bridge. We also notify the
  // parent chain of every hover change so it can keep a single source of
  // truth for "which dot is currently hovered" and suppress / restore
  // the persistent-default chip on the first active dot accordingly.
  const [isHovered, setIsHovered] = useState(false);

  // Selected halo: grows from 16x16 to 20x20 and 25% → 100% opacity.
  // Hover on an active (detected) dot also takes the halo to full opacity
  // so the dot reads as the same solid red as the inner circle — an
  // affordance that the dot is interactive without changing its size.
  const haloOpacity = isSelected || (detected && isHovered) ? 1 : detected ? 0.25 : 0;
  const haloSize = isSelected ? 20 : 16;
  const haloOffset = isSelected ? -6 : -4;

  const handleActivate = isClickable && onClick ? onClick : undefined;

  const showHoverChip = typeof anomalyCount === 'number';

  // `isHovered` lives above (next to `haloOpacity`) so the halo can also
  // react to hover. Hover is also broadcast to the chain via `onHoverChange`
  // so the persistent-default chip on the first active dot stays in sync.
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onHoverChange?.(tactic, false);
  }, [onHoverChange, tactic]);

  // Chip is visible when (a) the user is hovering / has focused this dot,
  // (b) this is the user-selected tactic, or (c) this dot is the chain's
  // persistent-default and no other dot is currently being hovered. (c)
  // implements the spec: first active tactic shows its chip by default,
  // disappears while the user hovers a different tactic, reappears as
  // soon as the cursor leaves all dots.
  const isChipVisible =
    showHoverChip &&
    (isHovered || isSelected || (isPersistentDefault && !isAnotherDotHovered));

  // Smart chip alignment — v.3 default is LEFT-aligned chip (extends
  // RIGHTWARD from the dot). For the last few dots in the chain, the
  // default would overflow the container's RIGHT edge → flip to
  // RIGHT-aligned (extends LEFTWARD). The measurement is alignment-
  // agnostic: it computes the chip's hypothetical LEFT-aligned right
  // edge from the dot center + measured chip width, so re-measuring
  // after a flip can't bounce the chip back and re-trigger overflow.
  const chipRef = useRef<HTMLDivElement | null>(null);
  const dotInnerRef = useRef<HTMLDivElement | null>(null);
  const [flipToRight, setFlipToRight] = useState(false);

  const measureAlignment = useCallback(() => {
    if (!showHoverChip) return;
    const chipEl = chipRef.current;
    const dotEl = dotInnerRef.current;
    const containerEl = containerRef?.current;
    if (!chipEl || !dotEl || !containerEl) return;
    const chipWidth = chipEl.getBoundingClientRect().width;
    if (chipWidth === 0) return;
    const dotRect = dotEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    if (containerRect.width === 0) return;
    const dotCenterX = dotRect.left + dotRect.width / 2;
    // Left-aligned chip's left edge sits at the dot center, so its right
    // edge would be at (dotCenterX + chipWidth). If that's past the
    // container's right edge, flip to right alignment.
    const hypotheticalLeftAlignedRight = dotCenterX + chipWidth;
    setFlipToRight(hypotheticalLeftAlignedRight > containerRect.right);
  }, [showHoverChip, containerRef]);

  useLayoutEffect(() => {
    measureAlignment();
    const containerEl = containerRef?.current;
    if (!containerEl || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measureAlignment);
    observer.observe(containerEl);
    return () => observer.disconnect();
  }, [measureAlignment, containerRef]);

  // Re-measure synchronously on mouseenter — by that point parent layout
  // is definitely settled. Runs before `setIsHovered(true)` so React
  // batches both updates and the chip's first visible frame is already
  // at the correct alignment. Also notifies the chain so it can suppress
  // the persistent-default chip on any sibling.
  const handleMouseEnter = useCallback(() => {
    measureAlignment();
    setIsHovered(true);
    onHoverChange?.(tactic, true);
  }, [measureAlignment, onHoverChange, tactic]);

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
      {/* Inner circle — refed so measureAlignment can read the dot's
          actual position (and therefore the dot center) without relying
          on the chip's current alignment. */}
      <div
        ref={dotInnerRef}
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
      {/* Outer halo — full opacity + expanded when selected. */}
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
      {/* Connector line — 4 px stub when last, full cell otherwise. */}
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

  const chipAriaLabel = showHoverChip
    ? `${tactic}, ${anomaliesCountTextV3(anomalyCount as number)}`
    : undefined;

  const chipRow = showHoverChip ? (
    <div
      css={css`
        position: relative;
        height: ${CHIP_ROW_HEIGHT}px;
        width: 100%;
      `}
    >
      {/* Tick stroke connecting the chip to the dot. */}
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
      {/* The chip itself — by DEFAULT its LEFT edge sits at the dot center
          (`left: 4px`) so the chip grows RIGHTWARD. For dots near the end
          of the chain where this would overflow the container, the
          `useLayoutEffect` above flips `flipToRight` to true and we anchor
          the chip's RIGHT edge at the dot center (`right: calc(100% - 4px)`)
          so the chip grows leftward and stays visible.
          `pointer-events: auto` only while visible so it never intercepts
          clicks on neighbouring cells. */}
      <div
        ref={chipRef}
        role={handleActivate ? 'button' : undefined}
        aria-label={chipAriaLabel}
        onClick={handleActivate ? handleChipClick : undefined}
        className="mitreTacticDotV3__hoverChip"
        data-test-subj={
          testSubjId ? `mitreTacticDotV3HoverChip-${testSubjId}` : 'mitreTacticDotV3HoverChip'
        }
        css={css`
          position: absolute;
          ${flipToRight
            ? css`
                right: calc(100% - 4px);
                left: auto;
              `
            : css`
                left: 4px;
                right: auto;
              `}
          bottom: ${TICK_HEIGHT + CHIP_TICK_GAP}px;
          opacity: ${isChipVisible ? 1 : 0};
          pointer-events: ${isChipVisible ? 'auto' : 'none'};
          cursor: ${handleActivate ? 'pointer' : 'default'};
          transition: opacity 120ms ease;
          white-space: nowrap;
          /* Hovered chip floats above the persistently-visible "selected"
             chip so it never gets buried by the active filter. */
          z-index: ${isHovered ? 5 : 4};
        `}
      >
        <EuiFlexGroup gutterSize="none" responsive={false} alignItems="center" wrap={false}>
          <EuiFlexItem grow={false}>
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
                      aria-label={clearFilterAriaLabelV3}
                      data-test-subj={
                        testSubjId
                          ? `mitreTacticDotV3HoverChipClear-${testSubjId}`
                          : 'mitreTacticDotV3HoverChipClear'
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
        // `padding-right: 8px` gives 8 px of horizontal breathing room
        // between adjacent tactic names. An EuiFlexGroup gutter on the
        // parent would segment the continuous connector line that joins
        // consecutive dots — per-cell padding avoids that.
        // No EuiToolTip per v.3 design — the inline ellipsis + the hover
        // chip already surface the full name.
        <div
          css={css`
            margin-top: ${euiTheme.size.s};
            min-width: 0;
            padding-right: 8px;
          `}
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
        </div>
      )}
    </div>
  );
};
