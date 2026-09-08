/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { runLogRateAnalysis } from '@kbn/aiops-log-rate-analysis/queries/fetch_log_rate_analysis_for_alert';
import type { WindowParameters } from '@kbn/aiops-log-rate-analysis/window_parameters';
import { parseDatemath } from '../../utils/time';
import { kqlFilter as kqlFilterToDsl } from '../../utils/dsl_filters';

export async function getToolHandler({
  esClient,
  logger,
  index,
  timeFieldName,
  baseline,
  deviation,
  kqlFilter,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  index: string;
  timeFieldName: string;
  baseline: { start: string; end: string };
  deviation: { start: string; end: string };
  kqlFilter?: string;
}) {
  const windowParameters: WindowParameters = {
    baselineMin: parseDatemath(baseline.start),
    baselineMax: parseDatemath(baseline.end, { roundUp: true }),
    deviationMin: parseDatemath(deviation.start),
    deviationMax: parseDatemath(deviation.end, { roundUp: true }),
  };

  const filters = kqlFilterToDsl(kqlFilter);
  const searchQuery = filters.length > 0 ? { bool: { filter: filters } } : { match_all: {} };

  const response = await runLogRateAnalysis({
    esClient,
    arguments: {
      index,
      windowParameters,
      timefield: timeFieldName,
      searchQuery,
    },
  });
  logger.debug(
    `Log rate analysis tool (index: "${index}") found ${response.significantItems.length} items of type ${response.logRateAnalysisType}.`
  );

  return {
    analysisType: response.logRateAnalysisType,
    items: response.significantItems,
  };
}
