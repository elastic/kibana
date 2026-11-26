/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  ChangeDirection,
  MeasureUnit,
  ScorecardMeasure,
  ScorecardPeriod,
  ScorecardReport,
} from '../../../common/types/scorecard';

const NO_VALUE = '–';

const formatValue = (value: number | null, unit: MeasureUnit): string => {
  if (value === null) {
    return NO_VALUE;
  }
  switch (unit) {
    case 'count':
      return value.toLocaleString('en-US');
    case 'ms':
      return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;
    case 'score':
      return value.toFixed(3);
    case 'rate':
      return value.toFixed(1);
    case 'ratio':
      return `${(value * 100).toFixed(2)}%`;
  }
};

const DIRECTION_LABELS: Record<ChangeDirection, string> = {
  better: i18n.translate('xpack.digitalExperience.report.summary.better', {
    defaultMessage: 'better',
  }),
  worse: i18n.translate('xpack.digitalExperience.report.summary.worse', {
    defaultMessage: 'worse',
  }),
  unchanged: i18n.translate('xpack.digitalExperience.report.summary.unchanged', {
    defaultMessage: 'unchanged',
  }),
  neutral: '',
  unknown: '',
};

const formatChange = ({ change, direction }: ScorecardMeasure): string => {
  const label = DIRECTION_LABELS[direction];
  if (change === null) {
    // e.g. errors rising from zero: no percentage, but still worse.
    return label ? ` (${label})` : '';
  }
  const percent = Math.abs(change * 100).toFixed(1);
  const signed = Number(percent) === 0 ? '0.0%' : `${change > 0 ? '+' : '−'}${percent}%`;
  return label ? ` (${signed}, ${label})` : ` (${signed})`;
};

const formatDay = (timestamp: number): string => new Date(timestamp).toISOString().slice(0, 10);

const formatPeriod = ({ start, end }: ScorecardPeriod): string =>
  `${formatDay(start)} – ${formatDay(end)}`;

/** The scorecard as markdown: a line per measure with its change, e.g. for a message or an email. */
export const buildScorecardSummary = ({
  serviceName,
  environment,
  period,
  previousPeriod,
  sections,
}: ScorecardReport): string => {
  const title = environment
    ? i18n.translate('xpack.digitalExperience.report.summary.titleWithEnvironment', {
        defaultMessage: 'Digital Experience scorecard: {serviceName} ({environment})',
        values: { serviceName, environment },
      })
    : i18n.translate('xpack.digitalExperience.report.summary.title', {
        defaultMessage: 'Digital Experience scorecard: {serviceName}',
        values: { serviceName },
      });
  const periods = i18n.translate('xpack.digitalExperience.report.summary.periods', {
    defaultMessage: '{period}, compared with {previousPeriod}',
    values: { period: formatPeriod(period), previousPeriod: formatPeriod(previousPeriod) },
  });

  const body = sections.map(({ title: sectionTitle, measures }) =>
    [
      `**${sectionTitle}**`,
      ...measures.map(
        (measure) =>
          `- ${measure.label}: ${formatValue(measure.value, measure.unit)}${formatChange(measure)}`
      ),
    ].join('\n')
  );

  return [`**${title}**`, periods, ...body].join('\n\n');
};
