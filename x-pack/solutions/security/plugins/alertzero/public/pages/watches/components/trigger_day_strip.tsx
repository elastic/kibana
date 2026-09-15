/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DAY_STRIP_DENSE_RUNS_PER_DAY } from './schedule_presets_data';

interface TriggerDayStripProps {
  intervalMinutes: number;
}

/**
 * 24h strip with one tick per scheduled run, collapsing to a solid band when
 * dense (>96 runs/day). Ported from the Sep 11 prototype TriggerDayStrip.
 * Purely presentational; the runs-per-day helper lives with the schedule row.
 */
export const TriggerDayStrip: React.FC<TriggerDayStripProps> = ({ intervalMinutes }) => {
  const { euiTheme } = useEuiTheme();
  const runs = Math.floor(1440 / Math.max(intervalMinutes, 1));
  const dense = runs > DAY_STRIP_DENSE_RUNS_PER_DAY;

  return (
    <div
      css={css`
        margin-top: 12px;
      `}
      aria-hidden="true"
      data-test-subj="alertZeroScheduleDayStrip"
    >
      <div
        css={css`
          position: relative;
          height: 26px;
          border: 1px solid ${euiTheme.colors.borderBaseSubdued};
          border-radius: ${euiTheme.border.radius.medium};
          background: ${euiTheme.colors.backgroundBaseSubdued};
          overflow: hidden;
        `}
      >
        {dense ? (
          <>
            <span
              css={css`
                position: absolute;
                left: 4px;
                right: 4px;
                top: 5px;
                bottom: 5px;
                border-radius: 1px;
                background: ${euiTheme.colors.primary};
                opacity: 0.35;
              `}
            />
            <span
              css={css`
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                color: ${euiTheme.colors.textParagraph};
                font-family: ${euiTheme.font.familyCode};
              `}
            >
              {i18n.translate('xpack.alertzero.watches.settings.scheduleInterval.denseRuns', {
                defaultMessage: '{runs} runs / day',
                values: { runs },
              })}
            </span>
          </>
        ) : (
          Array.from({ length: runs }, (_, i) => (
            <span
              key={i}
              css={css`
                position: absolute;
                top: 5px;
                bottom: 5px;
                width: 2px;
                border-radius: 1px;
                background: ${euiTheme.colors.primary};
                opacity: 0.85;
                left: ${(i / Math.max(runs, 1)) * 100}%;
              `}
            />
          ))
        )}
      </div>
      <div
        css={css`
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
          color: ${euiTheme.colors.textSubdued};
          margin-top: 4px;
          font-family: ${euiTheme.font.familyCode};
        `}
      >
        <span>now</span>
        <span>+6h</span>
        <span>+12h</span>
        <span>+18h</span>
        <span>+24h</span>
      </div>
    </div>
  );
};
