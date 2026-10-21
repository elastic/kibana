/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityRiskLevelsEnum } from '../../../../../common/api/entity_analytics/common';
import { RISK_LEVEL_RANGES } from '../../../../../common/entity_analytics/risk_engine/risk_levels';
import { formatMonthDay } from './describe_scope';
import type { BriefRiskHistory } from './view_model';

/** The fewest points that make a line worth drawing. */
export const MIN_CHART_POINTS = 3;

const WIDTH = 640;
const HEIGHT = 96;
const LEFT = 30;
const RIGHT = WIDTH - 70;
const TOP = 14;
const BOTTOM = HEIGHT - 22;
const LEVELS = [
  EntityRiskLevelsEnum.Critical,
  EntityRiskLevelsEnum.High,
  EntityRiskLevelsEnum.Moderate,
];

const format = (value: number): string => value.toFixed(1);

const describeTrend = (first: number, last: number): string => {
  if (last > first) {
    return 'rose from';
  }
  return last < first ? 'fell from' : 'stayed at';
};

/**
 * What `risk_history_chart.mustache.html` prints for a risk history: its caption, the change as text, and,
 * from enough points, the chart's geometry. The change is text too, so the chart is never the only place it is stated.
 */
export const buildRiskHistoryContext = ({ points, of }: BriefRiskHistory, periodLabel: string) => {
  const [first, last] = [points[0], points[points.length - 1]];
  const [firstScore, lastScore] = [Math.round(first.score), Math.round(last.score)];
  const start = new Date(first.t).getTime();
  const duration = new Date(last.t).getTime() - start || 1;
  const x = (time: string) =>
    LEFT + ((new Date(time).getTime() - start) / duration) * (RIGHT - LEFT);
  const y = (score: number) => TOP + (1 - score / 100) * (BOTTOM - TOP);
  const path = points.map(({ t, score }) => `${format(x(t))},${format(y(score))}`).join(' ');
  // One dated tick at the end of each day and at both ends, never closer than 60 px.
  const ticks = points
    .filter(({ t }, i) => [0, points.length - 1].includes(i) || new Date(t).getUTCHours() === 23)
    .filter(({ t }, i, all) => i === 0 || x(t) - x(all[i - 1].t) > 60);
  return {
    caption: `Risk score, last ${periodLabel}${
      of === 'resolution group' ? ', resolution group' : ''
    }`,
    change: `${firstScore} ${first.level} → ${lastScore} ${last.level}`,
    chart: points.length >= MIN_CHART_POINTS && {
      width: WIDTH,
      height: HEIGHT,
      left: LEFT,
      right: RIGHT,
      ariaLabel: `Risk score ${describeTrend(
        firstScore,
        lastScore
      )} ${firstScore} on ${formatMonthDay(first.t)} to ${lastScore} on ${formatMonthDay(last.t)}`,
      bands: LEVELS.map((level) => ({
        label: `${level} ${RISK_LEVEL_RANGES[level].start}`,
        y: format(y(RISK_LEVEL_RANGES[level].start)),
        labelX: RIGHT + 6,
        labelY: format(y(RISK_LEVEL_RANGES[level].start) + 3),
      })),
      area: `${LEFT},${y(0)} ${path} ${format(x(last.t))},${y(0)}`,
      path,
      dots: points.map(({ t, score }) => ({ x: format(x(t)), y: format(y(score)) })),
      first: { x: format(x(first.t)), y: format(y(first.score) - 7), text: firstScore },
      last: { x: format(x(last.t) - 7), y: format(y(last.score) - 6), text: lastScore },
      ticks: ticks.map(({ t }) => ({ x: format(x(t)), y: HEIGHT - 6, text: formatMonthDay(t) })),
    },
  };
};
