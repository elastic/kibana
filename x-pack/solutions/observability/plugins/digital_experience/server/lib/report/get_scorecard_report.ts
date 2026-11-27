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

/**
 * The baseline's KPIs, its counts per period. `COUNT_DISTINCT` sessions over all the periods count
 * a session that spans two of them once, which per period is close enough. No baseline when the
 * application sent nothing then, e.g. before it was instrumented.
 */
const toBaselineKpis = (kpis: PeriodKpis): BaselineKpis => {
  if (kpis.sessions === 0 && kpis.pageLoads === 0) {
    return NO_BASELINE_KPIS;
  }
  return {
    sessions: kpis.sessions / BASELINE_PERIODS,
    pageLoads: kpis.pageLoads / BASELINE_PERIODS,
    loadTime: kpis.loadTime,
    errorFreeSessions: kpis.errorFreeSessions,
    jsErrors: kpis.jsErrors / BASELINE_PERIODS,
    failedHttpRequests: kpis.failedHttpRatio,
    requestLatency: kpis.requestLatency,
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
  const baselinePeriod = { start: start - BASELINE_PERIODS * (end - start), end: start };

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
    getOtelPeriodKpis({
      ...search,
      esClient,
      start: baselinePeriod.start,
      end: baselinePeriod.end,
      operationName: BASELINE_KPIS_SPAN_NAME,
    }),
    webVitalsOf(baselinePeriod.start, baselinePeriod.end),
  ]);

  return buildScorecard({
    kpis,
    serviceName,
    webVitals: current.webVitals,
    previousWebVitals: previous.webVitals,
    baseline: { kpis: toBaselineKpis(baselineKpis), webVitals: baseline.webVitals },
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
