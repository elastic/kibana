/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { rumPerformanceScoreBand } from '../../../../common/rum_performance_score';
import {
  scoreSparklineAreaPath,
  scoreSparklineLinePath,
  scoreSparklinePoints,
} from './score_sparkline_path';

const WIDTH = 72;
const HEIGHT = 22;

export function ScoreSparkline({
  scores,
  score,
  ariaLabel,
}: {
  scores: number[];
  score: number;
  ariaLabel: string;
}) {
  const { euiTheme } = useEuiTheme();
  const points = useMemo(() => scoreSparklinePoints(scores, WIDTH, HEIGHT), [scores]);
  const band = rumPerformanceScoreBand(score);
  const color =
    band === 'success'
      ? euiTheme.colors.success
      : band === 'warning'
      ? euiTheme.colors.warning
      : euiTheme.colors.danger;

  if (points.length === 0) {
    return (
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.ux.inventory.emptyValueLabel', {
          defaultMessage: '—',
        })}
      </EuiText>
    );
  }

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-label={ariaLabel}
      role="img"
    >
      <path d={scoreSparklineAreaPath(points, HEIGHT)} fill={color} fillOpacity={0.2} />
      <path
        d={scoreSparklineLinePath(points)}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
