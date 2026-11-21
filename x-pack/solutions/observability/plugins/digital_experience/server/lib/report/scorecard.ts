/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CORE_WEB_VITAL, getVitalRating } from '../../../common/core_web_vitals';
import type { CoreWebVital } from '../../../common/core_web_vitals';
import type { VitalRatings } from '../../../common/types/applications';
import type { ApplicationOverview } from '../../../common/types/overview';
import type {
  ChangeDirection,
  MeasureUnit,
  ScorecardMeasure,
  ScorecardPeriod,
  ScorecardReport,
} from '../../../common/types/scorecard';

/** Which direction of change is an improvement; traffic is neither. */
export type BetterWhen = 'lower' | 'higher' | 'neutral';

/** Changes smaller than this are shown as unchanged, so noise doesn't read as a trend. */
const UNCHANGED_THRESHOLD = 0.01;

const getChange = (value: number | null, previous: number | null): number | null =>
  value === null || previous === null || previous === 0 ? null : (value - previous) / previous;

const getDirection = (
  betterWhen: BetterWhen,
  value: number | null,
  previous: number | null
): ChangeDirection => {
  if (value === null || previous === null) {
    return 'unknown';
  }
  const relative =
    previous === 0 ? (value === 0 ? 0 : Infinity) : Math.abs((value - previous) / previous);
  if (relative < UNCHANGED_THRESHOLD) {
    return 'unchanged';
  }
  if (betterWhen === 'neutral') {
    return 'neutral';
  }
  return value > previous === (betterWhen === 'higher') ? 'better' : 'worse';
};

interface MeasureInput {
  id: string;
  label: string;
  unit: MeasureUnit;
  betterWhen: BetterWhen;
  value: number | null;
  previous: number | null;
  vital?: CoreWebVital;
  ratings?: VitalRatings | null;
}

const toMeasure = ({
  id,
  label,
  unit,
  betterWhen,
  value,
  previous,
  vital,
  ratings,
}: MeasureInput): ScorecardMeasure => {
  const change = getChange(value, previous);
  return {
    id,
    label,
    unit,
    value,
    previous,
    change,
    direction: getDirection(betterWhen, value, previous),
    rating: vital && value !== null ? getVitalRating(vital, value) : null,
    ratings: ratings ?? null,
  };
};

const errorsPerHundredLoads = ({ jsErrors, pageLoads }: ApplicationOverview): number | null =>
  pageLoads.count === 0 ? null : (jsErrors.count / pageLoads.count) * 100;

const vitalValue = (overview: ApplicationOverview, vital: CoreWebVital): number | null => {
  const { webVitals } = overview;
  switch (vital) {
    case CORE_WEB_VITAL.cls:
      return webVitals.cls.p75;
    default:
      return webVitals[vital].p75Ms;
  }
};

const VITAL_LABELS: Record<CoreWebVital, string> = {
  lcp: i18n.translate('xpack.digitalExperience.report.scorecard.lcp', {
    defaultMessage: 'Largest Contentful Paint (p75)',
  }),
  inp: i18n.translate('xpack.digitalExperience.report.scorecard.inp', {
    defaultMessage: 'Interaction to Next Paint (p75)',
  }),
  cls: i18n.translate('xpack.digitalExperience.report.scorecard.cls', {
    defaultMessage: 'Cumulative Layout Shift (p75)',
  }),
  fcp: i18n.translate('xpack.digitalExperience.report.scorecard.fcp', {
    defaultMessage: 'First Contentful Paint (p75)',
  }),
  ttfb: i18n.translate('xpack.digitalExperience.report.scorecard.ttfb', {
    defaultMessage: 'Time to First Byte (p75)',
  }),
};

const VITAL_ORDER: readonly CoreWebVital[] = ['lcp', 'inp', 'cls', 'fcp', 'ttfb'];

export interface BuildScorecardParams {
  current: ApplicationOverview;
  previous: ApplicationOverview;
  environment?: string;
  environments: string[];
  period: ScorecardPeriod;
  previousPeriod: ScorecardPeriod;
  generatedAt: number;
}

/** The scorecard of one application: this period's measures next to the previous period's. */
export const buildScorecard = ({
  current,
  previous,
  environment,
  environments,
  period,
  previousPeriod,
  generatedAt,
}: BuildScorecardParams): ScorecardReport => {
  const traffic: ScorecardMeasure[] = [
    toMeasure({
      id: 'pageLoads',
      label: i18n.translate('xpack.digitalExperience.report.scorecard.pageLoads', {
        defaultMessage: 'Page loads',
      }),
      unit: 'count',
      betterWhen: 'neutral',
      value: current.pageLoads.count,
      previous: previous.pageLoads.count,
    }),
    toMeasure({
      id: 'loadTime',
      label: i18n.translate('xpack.digitalExperience.report.scorecard.loadTime', {
        defaultMessage: 'Page load time (p{percentile})',
        values: { percentile: current.percentile },
      }),
      unit: 'ms',
      betterWhen: 'lower',
      value: current.loadTime.percentileMs,
      previous: previous.loadTime.percentileMs,
    }),
    toMeasure({
      id: 'jsErrors',
      label: i18n.translate('xpack.digitalExperience.report.scorecard.jsErrors', {
        defaultMessage: 'JavaScript errors',
      }),
      unit: 'count',
      betterWhen: 'lower',
      value: current.jsErrors.count,
      previous: previous.jsErrors.count,
    }),
    toMeasure({
      id: 'jsErrorsPer100',
      label: i18n.translate('xpack.digitalExperience.report.scorecard.jsErrorsPer100', {
        defaultMessage: 'JavaScript errors per 100 page loads',
      }),
      unit: 'rate',
      betterWhen: 'lower',
      value: errorsPerHundredLoads(current),
      previous: errorsPerHundredLoads(previous),
    }),
    toMeasure({
      id: 'failedRequests',
      label: i18n.translate('xpack.digitalExperience.report.scorecard.failedRequests', {
        defaultMessage: 'Failed HTTP requests',
      }),
      unit: 'ratio',
      betterWhen: 'lower',
      value: current.httpRequests.failedRatio,
      previous: previous.httpRequests.failedRatio,
    }),
  ];

  const webVitals = VITAL_ORDER.map((vital) =>
    toMeasure({
      id: vital,
      label: VITAL_LABELS[vital],
      unit: vital === 'cls' ? 'score' : 'ms',
      betterWhen: 'lower',
      value: vitalValue(current, vital),
      previous: vitalValue(previous, vital),
      vital,
      ratings: current.webVitals[vital].ratings,
    })
  );

  return {
    serviceName: current.serviceName,
    ...(environment ? { environment } : {}),
    environments,
    period,
    previousPeriod,
    generatedAt,
    sections: [
      {
        id: 'traffic',
        title: i18n.translate('xpack.digitalExperience.report.scorecard.trafficTitle', {
          defaultMessage: 'Traffic and errors',
        }),
        measures: traffic,
      },
      {
        id: 'webVitals',
        title: i18n.translate('xpack.digitalExperience.report.scorecard.webVitalsTitle', {
          defaultMessage: 'Core Web Vitals',
        }),
        measures: webVitals,
      },
    ],
  };
};
