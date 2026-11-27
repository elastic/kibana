/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CORE_WEB_VITAL, getVitalRating } from '../../../common/core_web_vitals';
import type { CoreWebVital } from '../../../common/core_web_vitals';
import type { VitalRatings, WebVitals } from '../../../common/types/applications';
import type { ApplicationOverviewKpisResponse } from '../../../common/types/overview';
import { isNegligibleChange, type ChangeUnit } from '../../../common/negligible_change';
import type {
  MeasureUnit,
  ScorecardMeasure,
  ScorecardPeriod,
  ScorecardReport,
  ScorecardVerdict,
} from '../../../common/types/scorecard';

/** Which direction of change is an improvement; traffic is neither. */
export type BetterWhen = 'lower' | 'higher' | 'neutral';

/** Shares change in percentage points, as on the Overview, and any other measure relatively. */
const changeUnitOf = (unit: MeasureUnit): ChangeUnit =>
  unit === 'ratio' ? 'percentagePoints' : 'relative';

const getChange = (
  value: number | null,
  previous: number | null,
  changeUnit: ChangeUnit
): number | null => {
  if (value === null || previous === null) {
    return null;
  }
  if (changeUnit === 'percentagePoints') {
    return value - previous;
  }
  return previous === 0 ? null : (value - previous) / previous;
};

const getDirection = (
  betterWhen: BetterWhen,
  value: number | null,
  previous: number | null,
  changeUnit: ChangeUnit
): ScorecardVerdict => {
  if (value === null || previous === null) {
    return 'unknown';
  }
  // Noise by the Overview's cutoffs, so that both pages call the same change unchanged.
  if (isNegligibleChange(value, previous, changeUnit)) {
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
  const changeUnit = changeUnitOf(unit);
  return {
    id,
    label,
    unit,
    value,
    previous,
    change: getChange(value, previous, changeUnit),
    changeUnit,
    direction: getDirection(betterWhen, value, previous, changeUnit),
    rating: vital && value !== null ? getVitalRating(vital, value) : null,
    ratings: ratings ?? null,
  };
};

const errorsPer100 = (jsErrors: number | null, pageLoads: number | null): number | null =>
  jsErrors === null || !pageLoads ? null : (jsErrors / pageLoads) * 100;

const vitalValue = (webVitals: WebVitals, vital: CoreWebVital): number | null => {
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
  /** The KPIs of the period against the previous one. */
  kpis: ApplicationOverviewKpisResponse;
  serviceName: string;
  /** The web vitals of the period and of the previous one. */
  webVitals: WebVitals;
  previousWebVitals: WebVitals;
  environment?: string;
  environments: string[];
  period: ScorecardPeriod;
  previousPeriod: ScorecardPeriod;
  generatedAt: number;
}

/** The scorecard of one application: this period's measures next to the previous period's. */
export const buildScorecard = ({
  kpis,
  serviceName,
  webVitals: currentWebVitals,
  previousWebVitals,
  environment,
  environments,
  period,
  previousPeriod,
  generatedAt,
}: BuildScorecardParams): ScorecardReport => {
  const { sessions, pageLoads, loadTime, jsErrors, errorFreeSessions, failedHttpRequests } = kpis;
  const traffic: ScorecardMeasure[] = [
    toMeasure({
      id: 'sessions',
      label: i18n.translate('xpack.digitalExperience.report.scorecard.sessions', {
        defaultMessage: 'Sessions',
      }),
      unit: 'count',
      betterWhen: 'neutral',
      value: sessions.value,
      previous: sessions.previous,
    }),
    toMeasure({
      id: 'pageLoads',
      label: i18n.translate('xpack.digitalExperience.report.scorecard.pageLoads', {
        defaultMessage: 'Page loads',
      }),
      unit: 'count',
      betterWhen: 'neutral',
      value: pageLoads.value,
      previous: pageLoads.previous,
    }),
    toMeasure({
      id: 'loadTime',
      label: i18n.translate('xpack.digitalExperience.report.scorecard.loadTime', {
        defaultMessage: 'Page load time (p{percentile})',
        values: { percentile: kpis.percentile },
      }),
      unit: 'ms',
      betterWhen: 'lower',
      value: loadTime.value,
      previous: loadTime.previous,
    }),
    toMeasure({
      id: 'errorFreeSessions',
      label: i18n.translate('xpack.digitalExperience.report.scorecard.errorFreeSessions', {
        defaultMessage: 'Error-free sessions',
      }),
      unit: 'ratio',
      betterWhen: 'higher',
      value: errorFreeSessions.value,
      previous: errorFreeSessions.previous,
    }),
    toMeasure({
      id: 'jsErrors',
      label: i18n.translate('xpack.digitalExperience.report.scorecard.jsErrors', {
        defaultMessage: 'JavaScript errors',
      }),
      unit: 'count',
      betterWhen: 'lower',
      value: jsErrors.value,
      previous: jsErrors.previous,
    }),
    toMeasure({
      id: 'jsErrorsPer100',
      label: i18n.translate('xpack.digitalExperience.report.scorecard.jsErrorsPer100', {
        defaultMessage: 'JavaScript errors per 100 page loads',
      }),
      unit: 'rate',
      betterWhen: 'lower',
      value: errorsPer100(jsErrors.value, pageLoads.value),
      previous: errorsPer100(jsErrors.previous, pageLoads.previous),
    }),
    toMeasure({
      id: 'failedRequests',
      label: i18n.translate('xpack.digitalExperience.report.scorecard.failedRequests', {
        defaultMessage: 'Failed HTTP requests',
      }),
      unit: 'ratio',
      betterWhen: 'lower',
      value: failedHttpRequests.value,
      previous: failedHttpRequests.previous,
    }),
    toMeasure({
      id: 'requestLatency',
      label: i18n.translate('xpack.digitalExperience.report.scorecard.requestLatency', {
        defaultMessage: 'HTTP request duration (average)',
      }),
      unit: 'ms',
      betterWhen: 'lower',
      value: kpis.requestLatency.value,
      previous: kpis.requestLatency.previous,
    }),
  ];

  const webVitals = VITAL_ORDER.map((vital) =>
    toMeasure({
      id: vital,
      label: VITAL_LABELS[vital],
      unit: vital === 'cls' ? 'score' : 'ms',
      betterWhen: 'lower',
      value: vitalValue(currentWebVitals, vital),
      previous: vitalValue(previousWebVitals, vital),
      vital,
      ratings: currentWebVitals[vital].ratings,
    })
  );

  return {
    serviceName,
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
