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
 * A session's pages in one line: entry page → number of other pages → exit page, with every page
 * in a tooltip. The journey lists each page once, in order of first visit, so the entry and exit
 * come from the session: a visit `/` → `/products` → `/` exits on `/`, not on `/products`.
 */
export function JourneyTrail({
  journey,
  entryPage,
  exitPage,
}: {
  journey: string[];
  entryPage: string | null;
  exitPage: string | null;
}) {
  const { euiTheme } = useEuiTheme();

  const entry = entryPage ?? journey[0];
  const exit = exitPage ?? journey[journey.length - 1];
  if (!entry) {
    return <EmptyCellValue />;
  }
  const others = journey.filter((page) => page !== entry && page !== exit).length;
  const showExit = exit !== undefined && (exit !== entry || others > 0);
  const pages = journey.length > 0 ? journey : [entry];
  const tooltip = i18n.translate('xpack.digitalExperience.sessions.journey.tooltip', {
    defaultMessage: 'Pages, in order of first visit: {pages}. Exit page: {exit}.',
    values: { pages: pages.join(' → '), exit: exit ?? entry },
  });

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
    <EuiToolTip content={tooltip}>
      <span
        css={trailCss}
        tabIndex={0}
        aria-label={tooltip}
        data-test-subj="digitalExperienceSessionJourney"
      >
        <span css={pageCss}>{entry}</span>
        {others > 0 && (
          <>
            {arrow}
            <EuiBadge color="hollow">
              {i18n.translate('xpack.digitalExperience.sessions.journey.hiddenPagesLabel', {
                defaultMessage: '+{count}',
                values: { count: others },
              })}
            </EuiBadge>
          </>
        )}
        {showExit && (
          <>
            {arrow}
            <span css={pageCss}>{exit}</span>
          </>
        )}
      </span>
    </EuiToolTip>
  );
}
