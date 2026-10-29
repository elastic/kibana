/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';

/**
 * A session's pages in one line: entry page → number of pages in between → exit page, with the
 * full journey in a tooltip.
 */
export function JourneyTrail({ journey }: { journey: string[] }) {
  const { euiTheme } = useEuiTheme();

  if (journey.length === 0) {
    return <EmptyCellValue />;
  }

  const entry = journey[0];
  const exit = journey[journey.length - 1];
  const hidden = journey.length - 2;

  const trailCss = css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.xs,
    minWidth: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  });
  const pageCss = css({
    minWidth: 0,
    maxWidth: '14em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontFamily: euiTheme.font.familyCode,
    fontSize: euiTheme.size.m,
  });
  const arrow = <EuiIcon type="sortRight" size="s" color="subdued" aria-hidden={true} />;

  return (
    <EuiToolTip content={journey.join(' → ')}>
      <span
        css={trailCss}
        tabIndex={0}
        aria-label={i18n.translate('xpack.digitalExperience.sessions.journey.ariaLabel', {
          defaultMessage: 'Journey: {journey}',
          values: { journey: journey.join(', ') },
        })}
        data-test-subj="digitalExperienceSessionJourney"
      >
        <span css={pageCss}>{entry}</span>
        {hidden > 0 && (
          <>
            {arrow}
            <EuiBadge color="hollow">
              {i18n.translate('xpack.digitalExperience.sessions.journey.hiddenPagesLabel', {
                defaultMessage: '+{count}',
                values: { count: hidden },
              })}
            </EuiBadge>
          </>
        )}
        {journey.length > 1 && (
          <>
            {arrow}
            <span css={pageCss}>{exit}</span>
          </>
        )}
      </span>
    </EuiToolTip>
  );
}
