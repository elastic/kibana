/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scaleLinear, scaleUtc } from 'd3-scale';
import moment from 'moment';
import { EntityRiskLevelsEnum } from '../../../../../common/api/entity_analytics/common';
import { RISK_LEVEL_RANGES } from '../../../../../common/entity_analytics/risk_engine/risk_levels';
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
  const x = scaleUtc()
    .domain([new Date(first.t), new Date(last.t)])
    .rangeRound([LEFT, RIGHT]);
  const y = scaleLinear().domain([0, 100]).rangeRound([BOTTOM, TOP]);
  const path = points.map(({ t, score }) => `${x(new Date(t))},${y(score)}`).join(' ');
  const day = (iso: string) => moment.utc(iso).format('D MMM');
  // Days over a period of days, times over a period of hours.
  const spansDays = moment.utc(last.t).diff(first.t, 'days') >= 2;
  const tickFormat = spansDays ? 'D MMM' : 'HH:mm';
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
      ariaLabel: `Risk score ${describeTrend(firstScore, lastScore)} ${firstScore} on ${day(
        first.t
      )} to ${lastScore} on ${day(last.t)}`,
      bands: LEVELS.map((level) => ({
        label: `${level} ${RISK_LEVEL_RANGES[level].start}`,
        y: y(RISK_LEVEL_RANGES[level].start),
        labelX: RIGHT + 6,
        labelY: y(RISK_LEVEL_RANGES[level].start) + 3,
      })),
      area: `${LEFT},${y(0)} ${path} ${x(new Date(last.t))},${y(0)}`,
      path,
      dots: points.map(({ t, score }) => ({ x: x(new Date(t)), y: y(score) })),
      first: { x: x(new Date(first.t)), y: y(first.score) - 7, text: firstScore },
      last: { x: x(new Date(last.t)) - 7, y: y(last.score) - 6, text: lastScore },
      ticks: x
        .ticks(5)
        .map((tick) => ({ x: x(tick), y: HEIGHT - 6, text: moment.utc(tick).format(tickFormat) })),
    },
  };
};
