/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import type { ValueMetrics } from './metrics';

export const SAMPLE_VALUE_METRICS: ValueMetrics = {
  attackDiscoveryCount: 60,
  filteredAlerts: 16546,
  filteredAlertsPerc: 98.53,
  escalatedAlertsPerc: 1.47,
  hoursSaved: 2239,
  totalAlerts: 16793,
  costSavings: 167930,
};

export const SAMPLE_VALUE_METRICS_COMPARE: ValueMetrics = {
  attackDiscoveryCount: 2,
  filteredAlerts: 7848,
  filteredAlertsPerc: 99.94,
  escalatedAlertsPerc: 0.06,
  hoursSaved: 1047,
  totalAlerts: 7853,
  costSavings: 136500,
};

const SAMPLE_TREND_COST_SAVINGS = [
  401, 485, 559, 491, 456, 510, 471, 488, 369, 315, 210, 200, 271, 367, 375, 331, 397, 469, 600,
  600, 486, 405, 370, 344, 377, 281, 231, 121, 244, 370, 473, 464, 503, 455, 521, 541, 503, 415,
  327, 236, 307, 278, 280, 277, 320, 397, 496, 563, 586, 530, 468, 450, 445, 400, 318, 205, 148,
  290, 371, 403, 425, 412,
] as const;

export const getSampleTrendData = (from: string, to: string) => {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  const step = (toMs - fromMs) / (SAMPLE_TREND_COST_SAVINGS.length - 1);
  return SAMPLE_TREND_COST_SAVINGS.map((costSavings, index) => ({
    timestamp: fromMs + index * step,
    costSavings,
  }));
};

// Key insight descriptive values — derived from SAMPLE_TREND_COST_SAVINGS above.
// Update these if the trend data changes.
const SAMPLE_KEY_INSIGHT_AVERAGED_COST = '$400';
const SAMPLE_KEY_INSIGHT_COST_RANGE = '$450–$600';
const SAMPLE_KEY_INSIGHT_PROJECTED_ANNUAL_SAVINGS = '$200K';

export const getSampleKeyInsightMarkdown = (from: string, to: string): string => {
  const fromFormatted = moment(from).format('LL');
  const toFormatted = moment(to).format('LL');

  const averagedValue = i18n.translate(
    'xpack.securitySolution.reports.aiValue.sampleKeyInsightBullet1.averagedValueLabel',
    {
      defaultMessage: 'averaged around {value}',
      values: { value: SAMPLE_KEY_INSIGHT_AVERAGED_COST },
    }
  );
  const trendValue = i18n.translate(
    'xpack.securitySolution.reports.aiValue.sampleKeyInsightBullet2.trendValueLabel',
    { defaultMessage: 'upward trend' }
  );
  const exceedValue = i18n.translate(
    'xpack.securitySolution.reports.aiValue.sampleKeyInsightBullet3.exceedValueLabel',
    {
      defaultMessage: 'exceed {value}',
      values: { value: SAMPLE_KEY_INSIGHT_PROJECTED_ANNUAL_SAVINGS },
    }
  );

  return [
    `- ${i18n.translate(
      'xpack.securitySolution.reports.aiValue.sampleKeyInsightBullet1.descriptionDetail',
      {
        defaultMessage:
          'Between {from} and {to}, cost savings **{averagedValue}**, appearing frequently throughout the period.',
        values: { from: fromFormatted, to: toFormatted, averagedValue },
      }
    )}`,
    `- ${i18n.translate(
      'xpack.securitySolution.reports.aiValue.sampleKeyInsightBullet2.descriptionDetail',
      {
        defaultMessage:
          'Savings showed an **{trendValue}**, with more {intervalRange} intervals emerging.',
        values: { trendValue, intervalRange: SAMPLE_KEY_INSIGHT_COST_RANGE },
      }
    )}`,
    `- ${i18n.translate(
      'xpack.securitySolution.reports.aiValue.sampleKeyInsightBullet3.descriptionDetail',
      {
        defaultMessage:
          'At this pace, projected annual savings **{exceedValue}**, indicating consistent and growing ROI.',
        values: { exceedValue },
      }
    )}`,
  ].join('\n');
};
