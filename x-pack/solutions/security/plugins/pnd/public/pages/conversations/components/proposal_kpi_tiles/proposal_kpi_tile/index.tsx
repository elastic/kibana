/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { RecommendedAction } from '@kbn/pnd-common';

import { ActivitySparkline } from '../activity_sparkline';
import type { PndSparklinePoint } from '../helpers/build_sparkline_series';
import * as i18n from '../../../translations';

/** The prototype's card radius, which is one step softer than EUI's panel radius. */
const CARD_BORDER_RADIUS_PX = 8;

export interface ProposalKpiTileProps {
  action: RecommendedAction;
  /** Gates of this phase **still waiting** — not what the sparkline charts. */
  count: number;
  label: string;
  onSelect: () => void;
  /** One point per hour, oldest first. Empty when the activity read failed or has not landed. */
  series: PndSparklinePoint[];
}

/**
 * One phase's card: an uppercase label, the pending count, the 24h shape, and the window the shape
 * covers.
 *
 * **Two numbers live here and they are not the same measurement.** The count is what is still
 * waiting, derived from the already-filtered queue, so a watch chip that hides rows lowers it. The
 * sparkline is gates *opened* per hour over the last 24 hours, unfiltered, from its own route. The
 * `aria-label` describes the count alone, because that is the number the tile leads with and the one
 * pressing it acts on.
 *
 * A `div` with `role="button"` rather than an EUI button: the card holds a chart, and a chart's own
 * pointer handling inside a real `<button>` is a nested-interactive trap. Enter and Space are wired
 * by hand for the same reason.
 *
 * The window labels are drawn only alongside a chart. Bounding an absent chart with "24h ago" and
 * "Now" would attach a 24 hour window to the count, which does not have one.
 */
export const ProposalKpiTile: React.FC<ProposalKpiTileProps> = ({
  action,
  count,
  label,
  onSelect,
  series,
}) => {
  const { euiTheme } = useEuiTheme();

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      onSelect();
    },
    [onSelect]
  );

  return (
    <div
      aria-label={i18n.kpiTileAriaLabel({ count, label })}
      css={css`
        background: ${euiTheme.colors.emptyShade};
        block-size: 100%;
        border: ${euiTheme.border.width.thin} solid ${euiTheme.border.color};
        border-radius: ${CARD_BORDER_RADIUS_PX}px;
        box-sizing: border-box;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
        min-inline-size: 0;
        padding: ${euiTheme.size.m};
        transition: background ${euiTheme.animation.fast} ease-in-out;

        &:hover {
          background: ${euiTheme.colors.backgroundBaseSubdued};
        }

        /* EUI's global focus ring is scoped to real interactive elements, and this card is a div. */
        &:focus-visible {
          outline: ${euiTheme.focus.width} solid ${euiTheme.colors.primary};
          outline-offset: ${euiTheme.focus.width};
        }
      `}
      data-recommended-action={action}
      data-test-subj={`pndBriefKpiTile-${action}`}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
    >
      <EuiTitle
        css={css`
          color: ${euiTheme.colors.textSubdued};
        `}
        size="xxxs"
        textTransform="uppercase"
      >
        <span>{label}</span>
      </EuiTitle>

      <EuiTitle
        css={css`
          margin: 0;
        `}
        size="s"
      >
        <p data-test-subj={`pndBriefKpiTileCount-${action}`}>{count}</p>
      </EuiTitle>

      <ActivitySparkline action={action} label={label} series={series} />

      {series.length > 0 && (
        <div
          css={css`
            display: flex;
            justify-content: space-between;
          `}
          data-test-subj={`pndBriefKpiSparklineFooter-${action}`}
        >
          <EuiText color="subdued" size="xs">
            {i18n.SPARKLINE_WINDOW_START}
          </EuiText>

          <EuiText color="subdued" size="xs">
            {i18n.SPARKLINE_WINDOW_END}
          </EuiText>
        </div>
      )}
    </div>
  );
};
