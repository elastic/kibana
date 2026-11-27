/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPreviousPeriod } from '../../../common/mobile/kpis';
import type { ScorecardReport } from '../../../common/types/scorecard';
import { getOtelOverviewKpis } from '../../routes/overview/otel/get_otel_overview_kpis';
import type { ApplicationSearch } from '../../routes/application_tab_route';
import { sortEnvironments } from '../helpers/environment';
import { buildScorecard } from './scorecard';
import {
  toWebVitalsResult,
  webVitalsSearch,
  type WebVitalsAggregations,
} from './web_vitals_search';

const WEB_VITALS_SEARCH_SPAN_NAME = 'get_scorecard_web_vitals';

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

  const webVitalsOf = async (periodStart: number, periodEnd: number) => {
    const { aggregations } = await esClient.search(
      WEB_VITALS_SEARCH_SPAN_NAME,
      webVitalsSearch({ ...search, start: periodStart, end: periodEnd })
    );
    return toWebVitalsResult(aggregations as unknown as WebVitalsAggregations | undefined);
  };

  const [kpis, current, previous] = await Promise.all([
    getOtelOverviewKpis({ ...search, esClient }),
    webVitalsOf(start, end),
    webVitalsOf(previousPeriod.start, previousPeriod.end),
  ]);

  return buildScorecard({
    kpis,
    serviceName,
    webVitals: current.webVitals,
    previousWebVitals: previous.webVitals,
    environment,
    // Also those that sent nothing in this period, to tell where a drop in traffic comes from.
    environments: sortEnvironments([...current.environments, ...previous.environments]),
    period: { start, end },
    previousPeriod,
    generatedAt: Date.now(),
  });
};
