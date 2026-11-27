/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getPreviousPeriod } from '../../../common/mobile/kpis';
import type { ScorecardReport } from '../../../common/types/scorecard';
import { getOtelOverview } from '../../routes/overview/otel/get_otel_overview';
import { getOtelOverviewKpis } from '../../routes/overview/otel/get_otel_overview_kpis';
import type { ApplicationSearchParams } from '../../routes/application_tab_route';
import { createDigitalExperienceTracedEsClient } from '../create_digital_experience_traced_es_client';
import { sortEnvironments } from '../helpers/environment';
import { getHistogramInterval } from '../helpers/time_series';
import { buildScorecard } from './scorecard';

export type GetScorecardReportParams = ApplicationSearchParams & {
  client: ElasticsearchClient;
  logger: Logger;
  /** Cancels the searches, e.g. when the HTTP request is aborted. */
  signal?: AbortSignal;
};

/**
 * The scorecard of an application over `start`-`end`, compared with the period of the same length
 * right before it. The searches run as the user of `client`.
 */
export const getScorecardReport = async ({
  client,
  logger,
  signal,
  ...search
}: GetScorecardReportParams): Promise<ScorecardReport> => {
  const { start, end, environment } = search;
  const previousPeriod = getPreviousPeriod(start, end);

  // The scorecard has no trend, so the buckets of the overview searches are never read.
  const overviewOf = (periodStart: number, periodEnd: number) =>
    getOtelOverview({
      ...search,
      esClient: client,
      start: periodStart,
      end: periodEnd,
      histogram: { interval: getHistogramInterval(periodStart, periodEnd), timeZone: 'UTC' },
      signal,
    });

  const [kpis, current, previous] = await Promise.all([
    getOtelOverviewKpis({
      ...search,
      esClient: createDigitalExperienceTracedEsClient({ client, logger, abortSignal: signal }),
    }),
    overviewOf(start, end),
    // Up to the last millisecond before `start`: the Overview's range includes both ends, and a
    // sample at the boundary belongs to the current period only.
    overviewOf(previousPeriod.start, previousPeriod.end - 1),
  ]);

  return buildScorecard({
    kpis,
    current: current.overview,
    previous: previous.overview,
    environment,
    // Also those that sent nothing in this period, to tell where a drop in traffic comes from.
    environments: sortEnvironments([...current.environments, ...previous.environments]),
    period: { start, end },
    previousPeriod,
    generatedAt: Date.now(),
  });
};
