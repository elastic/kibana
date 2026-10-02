/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';

export const MetricValue = ({
  value,
  metric,
  range,
}: {
  value: number;
  metric: string;
  range: string;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const { core } = useKibana();
  const key = `nightshift:detection:totals:${core.http.basePath.get()}:${range}:${metric}`;
  const [previous] = useState<number | undefined>(() => {
    try {
      const saved = sessionStorage.getItem(key);
      const parsed = saved === null ? undefined : Number(saved);
      return parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(key, String(value));
    } catch {
      /* Storage is optional; the current count remains available. */
    }
  }, [key, value]);
  const delta = previous === undefined ? 0 : value - previous;
  return (
    <>
      <span
        css={css`
          font-size: ${euiTheme.font.scale.l}rem;
          font-weight: ${euiTheme.font.weight.semiBold};
          font-variant-numeric: tabular-nums;
        `}
      >
        {value.toLocaleString(i18n.getLocale())}
      </span>
      {delta !== 0 && (
        <EuiToolTip
          content={i18n.translate('xpack.significantEventsApp.metrics.sinceVisit', {
            defaultMessage:
              'Change in this total since your previous visit in this browser session.',
          })}
        >
          <span
            tabIndex={0}
            css={css`
              font-size: ${euiTheme.font.scale.xs}rem;
              color: ${delta > 0 ? euiTheme.colors.primary : euiTheme.colors.textSubdued};
            `}
          >
            {delta > 0 ? '+' : ''}
            {delta.toLocaleString(i18n.getLocale())}
          </span>
        </EuiToolTip>
      )}
    </>
  );
};
