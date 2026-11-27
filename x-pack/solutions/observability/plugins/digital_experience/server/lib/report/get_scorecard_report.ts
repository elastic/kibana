/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPreviousPeriod } from '../../../common/mobile/kpis';
import type { ScorecardReport } from '../../../common/types/scorecard';
import {
  getOtelOverviewKpis,
  getOtelPeriodKpis,
  type PeriodKpis,
} from '../../routes/overview/otel/get_otel_overview_kpis';
import type { ApplicationSearch } from '../../routes/application_tab_route';
import { sortEnvironments } from '../helpers/environment';
import { BASELINE_PERIODS, buildScorecard, NO_BASELINE_KPIS, type BaselineKpis } from './scorecard';
import {
  toWebVitalsResult,
  webVitalsSearch,
  type WebVitalsAggregations,
} from './web_vitals_search';

const WEB_VITALS_SEARCH_SPAN_NAME = 'get_scorecard_web_vitals';
const BASELINE_KPIS_SPAN_NAME = 'get_scorecard_baseline_kpis';

/** Whether the application sent anything in a period: a page load, session, JS error or request. */
const hasTelemetry = ({
  sessions,
  pageLoads,
  jsErrors,
  httpRequests,
  requestLatency,
}: PeriodKpis) =>
  sessions > 0 || pageLoads > 0 || jsErrors > 0 || httpRequests > 0 || requestLatency !== null;

/** The mean of the values, `null` without any. */
const meanOf = (values: Array<number | null>): number | null => {
  const known = values.filter((value): value is number => value !== null);
  return known.length > 0 ? known.reduce((sum, value) => sum + value, 0) / known.length : null;
};

/**
 * The baseline's KPIs: each the mean of its value in the periods the application sent anything,
 * so a period before it was instrumented doesn't pull the baseline down. Each period counts its
 * own distinct sessions, so a session that spans several periods counts in each, as it would in
 * the current one. No baseline without any such period.
 */
export const averageBaselineKpis = (periods: PeriodKpis[]): BaselineKpis => {
  const withTelemetry = periods.filter(hasTelemetry);
  if (withTelemetry.length === 0) {
    return NO_BASELINE_KPIS;
  }
  const mean = (valueOf: (kpis: PeriodKpis) => number | null) => meanOf(withTelemetry.map(valueOf));
  return {
    sessions: mean(({ sessions }) => sessions),
    pageLoads: mean(({ pageLoads }) => pageLoads),
    loadTime: mean(({ loadTime }) => loadTime),
    errorFreeSessions: mean(({ errorFreeSessions }) => errorFreeSessions),
    jsErrors: mean(({ jsErrors }) => jsErrors),
    failedHttpRequests: mean(({ failedHttpRatio }) => failedHttpRatio),
    requestLatency: mean(({ requestLatency }) => requestLatency),
  };
};

/**
 * The scorecard of an application over `start`-`end`, compared with the period of the same length
 * right before it. The searches run as the user of `esClient`.
 */
export const getScorecardReport = async ({
  esClient,
  ...search
}: ApplicationSearch): Promise<ScorecardReport> => {
  const { serviceName, start, end, environment } = search;
  const previousPeriod = getPreviousPeriod(start, end);
  const periodLength = end - start;
  const baselinePeriod = { start: start - BASELINE_PERIODS * periodLength, end: start };
  // The baseline's periods, oldest first, each as long as this one.
  const baselinePeriods = Array.from({ length: BASELINE_PERIODS }, (_, index) => ({
    start: baselinePeriod.start + index * periodLength,
    end: baselinePeriod.start + (index + 1) * periodLength,
  }));

  const webVitalsOf = async (periodStart: number, periodEnd: number) => {
    const { aggregations } = await esClient.search(
      WEB_VITALS_SEARCH_SPAN_NAME,
      webVitalsSearch({ ...search, start: periodStart, end: periodEnd })
    );
    return toWebVitalsResult(aggregations as unknown as WebVitalsAggregations | undefined);
  };

  const [kpis, current, previous, baselineKpis, baseline] = await Promise.all([
    getOtelOverviewKpis({ ...search, esClient }),
    webVitalsOf(start, end),
    webVitalsOf(previousPeriod.start, previousPeriod.end),
    Promise.all(
      baselinePeriods.map((period) =>
        getOtelPeriodKpis({
          ...search,
          esClient,
          ...period,
          operationName: BASELINE_KPIS_SPAN_NAME,
        })
      )
    ),
    webVitalsOf(baselinePeriod.start, baselinePeriod.end),
  ]);

  return buildScorecard({
    kpis,
    serviceName,
    webVitals: current.webVitals,
    previousWebVitals: previous.webVitals,
    baseline: { kpis: averageBaselineKpis(baselineKpis), webVitals: baseline.webVitals },
    environment,
    // Also those that sent nothing in this period, to tell where a drop in traffic comes from.
    environments: sortEnvironments([
      ...current.environments,
      ...previous.environments,
      ...baseline.environments,
    ]),
    period: { start, end },
    previousPeriod,
    baselinePeriod,
    generatedAt: Date.now(),
  });
};
