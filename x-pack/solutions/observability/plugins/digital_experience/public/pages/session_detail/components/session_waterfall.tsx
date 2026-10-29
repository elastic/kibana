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
import { getEbtProps } from '@kbn/ebt-click';
import type { SessionPageVisit } from '../../../../common/sessions';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../../ebt_constants';
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
 * marker at each error. Selecting a segment shows that visit in the journey.
 */
export function SessionWaterfall({
  layout,
  pageVisits,
  colors,
  onSelectVisit,
}: {
  layout: SessionWaterfallLayout;
  pageVisits: SessionPageVisit[];
  colors: Map<string, string>;
  onSelectVisit: (index: number) => void;
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
    padding: 0,
    border: 'none',
    borderRight: `1px solid ${euiTheme.colors.emptyShade}`,
    cursor: 'pointer',
    '&:hover, &:focus-visible': { filter: 'brightness(1.15)' },
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
              <button
                type="button"
                data-test-subj="digitalExperienceSessionWaterfallSegment"
                {...getEbtProps({
                  action: DIGITAL_EXPERIENCE_EBT_ACTIONS.VIEW_SESSION,
                  element: SESSIONS_EBT_ELEMENTS.WATERFALL_PAGE,
                })}
                aria-label={label}
                css={segmentCss}
                style={{ background: colors.get(page) }}
                onClick={() => onSelectVisit(index)}
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
                  // Shifted back by the same share of its width, so it stays inside the bar,
                  // which clips: centered mid-bar, flush with the end for an error at 100%, as
                  // errors often end a session.
                  left: `${offsetPercent}%`,
                  transform: `translateX(-${offsetPercent}%)`,
                  width: MARKER_HIT_WIDTH,
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
