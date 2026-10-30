/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CSSProperties } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  euiPaletteColorBlind,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SessionPageVisit } from '../../../../common/sessions';
import { formatSessionDuration } from '../../../utils/format_session_duration';
import type { SessionWaterfallLayout } from '../utils/session_timeline';
import { formatOffset } from '../utils/session_timeline';

const BAR_HEIGHT = 28;
const MARKER_HIT_WIDTH = 8;

/** Places a tooltip anchor on the bar, from its runtime offset and width. */
const anchorStyle = (position: CSSProperties): CSSProperties => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  minWidth: 3,
  ...position,
});

/** A color per page, the same for each visit of the page, in order of first visit. */
export const pageColors = (pageVisits: SessionPageVisit[]): Map<string, string> => {
  const palette = euiPaletteColorBlind({ rotations: 2 });
  const colors = new Map<string, string>();
  for (const { page } of pageVisits) {
    if (!colors.has(page)) {
      colors.set(page, palette[colors.size % palette.length]);
    }
  }
  return colors;
};

/**
 * The session on one bar: a segment per page visit, as wide as the time spent on the page, and a
 * marker at each error.
 */
export function SessionWaterfall({
  layout,
  pageVisits,
  colors,
}: {
  layout: SessionWaterfallLayout;
  pageVisits: SessionPageVisit[];
  colors: Map<string, string>;
}) {
  const { euiTheme } = useEuiTheme();

  const barCss = css({
    position: 'relative',
    height: BAR_HEIGHT,
    borderRadius: euiTheme.border.radius.medium,
    background: euiTheme.colors.backgroundBaseSubdued,
    overflow: 'hidden',
  });
  // The tooltip anchors are positioned on the bar (`anchorStyle`), so tooltips point at them;
  // segments and markers fill their anchor.
  const segmentCss = css({
    display: 'block',
    width: '100%',
    height: '100%',
    borderRight: `1px solid ${euiTheme.colors.emptyShade}`,
  });
  // A hit area wider than the 2px line, so the marker can be hovered and focused for its tooltip.
  const markerCss = css({
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    '&::after': {
      content: '""',
      width: 2,
      background: euiTheme.colors.danger,
      boxShadow: `0 0 0 1px ${euiTheme.colors.emptyShade}`,
    },
  });
  const swatchCss = css({
    display: 'inline-block',
    width: euiTheme.size.s,
    height: euiTheme.size.s,
    borderRadius: euiTheme.border.radius.small,
    marginRight: euiTheme.size.xs,
  });

  return (
    <div data-test-subj="digitalExperienceSessionWaterfall">
      <div css={barCss}>
        {layout.segments.map(({ index, page, offsetPercent, widthPercent }) => {
          const visit = pageVisits[index];
          const label = i18n.translate(
            'xpack.digitalExperience.sessionDetail.waterfall.visitLabel',
            {
              defaultMessage:
                '{page}: {duration}, {clicks, plural, one {# click} other {# clicks}}, {errors, plural, one {# error} other {# errors}}',
              values: {
                page,
                duration: formatSessionDuration(visit.durationMs),
                clicks: visit.clickCount,
                errors: visit.errorCount,
              },
            }
          );
          return (
            <EuiToolTip
              key={index}
              content={label}
              anchorProps={{
                style: anchorStyle({ left: `${offsetPercent}%`, width: `${widthPercent}%` }),
              }}
            >
              <span
                data-test-subj="digitalExperienceSessionWaterfallSegment"
                // Focusable, so keyboard users get the tooltip too.
                tabIndex={0}
                role="img"
                aria-label={label}
                css={segmentCss}
                style={{ background: colors.get(page) }}
              />
            </EuiToolTip>
          );
        })}
        {layout.errorMarkers.map(({ offsetPercent, event }, index) => {
          const label = `${formatOffset(event.offsetMs)} ${event.name}${
            event.detail ? `: ${event.detail}` : ''
          }`;
          return (
            <EuiToolTip
              key={index}
              content={label}
              anchorProps={{
                style: anchorStyle({
                  left: `${offsetPercent}%`,
                  width: MARKER_HIT_WIDTH,
                  marginLeft: -MARKER_HIT_WIDTH / 2,
                }),
              }}
            >
              <span
                data-test-subj="digitalExperienceSessionWaterfallError"
                // Focusable, so keyboard users get the error's details too.
                tabIndex={0}
                role="img"
                aria-label={label}
                css={markerCss}
              />
            </EuiToolTip>
          );
        })}
      </div>
      <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {formatOffset(0)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {formatOffset(layout.totalMs)}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="m" wrap responsive={false}>
        {[...colors].map(([page, color]) => (
          <EuiFlexItem grow={false} key={page}>
            <EuiText size="xs" color="subdued">
              <span css={swatchCss} style={{ background: color }} aria-hidden={true} />
              {page}
            </EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
}
