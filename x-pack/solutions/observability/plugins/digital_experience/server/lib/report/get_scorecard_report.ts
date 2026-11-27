/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOtelOverview } from '../../routes/overview/otel/get_otel_overview';
import type { ScorecardReport } from './scorecard';
import { buildScorecard } from './scorecard';

type OverviewParams = Parameters<typeof getOtelOverview>[0];

export type GetScorecardReportParams = Omit<OverviewParams, 'percentile'>;

/**
 * The scorecard of an application over `start`-`end`, compared with the period of the same length
 * right before it. Both periods are searched as the requesting user.
 */
export const getScorecardReport = async (
  params: GetScorecardReportParams
): Promise<ScorecardReport> => {
  const { start, end, environment } = params;
  const previousStart = start - (end - start);

  const [current, previous] = await Promise.all([
    getOtelOverview(params),
    getOtelOverview({ ...params, start: previousStart, end: start }),
  ]);

  return buildScorecard({
    current: current.overview,
    previous: previous.overview,
    environment,
    period: { start, end },
    previousPeriod: { start: previousStart, end: start },
    generatedAt: Date.now(),
  });
};
