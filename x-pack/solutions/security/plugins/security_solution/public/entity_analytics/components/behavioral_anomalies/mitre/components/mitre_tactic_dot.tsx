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

import React from 'react';
import { EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

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

  const dotRow = (
    <div
      css={css`
        position: relative;
        height: 8px;
      `}
    >
      {/* Inner circle */}
      <div
        data-test-subj="mitreInnerCircle"
        css={css`
          position: absolute;
          left: 0;
          top: 0;
          width: 8px;
          height: 8px;
          background: transparent;
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

  // The dot row is the hover target. The tooltip mirrors `@elastic/charts`
  // styling (compact, dark surface) by relying on the EuiToolTip defaults.
  const dotRowWithTooltip =
    typeof anomalyCount === 'number' ? (
      <EuiToolTip
        position="top"
        content={
          <div>
            <strong>{tactic}</strong>
            <div>{anomaliesCountText(anomalyCount)}</div>
          </div>
        }
        anchorProps={{
          css: css`
            display: block;
            width: 100%;
          `,
        }}
      >
        {dotRow}
      </EuiToolTip>
    ) : (
      dotRow
    );

  // The dot column becomes a button-like target when the parent enables
  // click-to-filter. Native `<button>` styling would inject browser defaults
  // (background, padding, focus ring) that fight the dot layout, so we use a
  // div with `role="button"` and our own focus-visible outline.
  const interactiveProps = handleActivate
    ? {
        role: 'button' as const,
        tabIndex: 0,
        'aria-pressed': isSelected,
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

  return (
    <div
      data-test-subj={dotTestSubj}
      css={css`
        position: relative;
        width: 100%;
        ${interactiveCss};
      `}
      {...interactiveProps}
    >
      {dotRowWithTooltip}
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
