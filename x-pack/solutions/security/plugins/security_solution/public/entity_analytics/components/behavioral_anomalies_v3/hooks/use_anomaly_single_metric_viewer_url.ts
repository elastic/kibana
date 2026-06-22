/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_PAGES, useMlHref } from '@kbn/ml-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';
import { BEHAVIORAL_ANOMALIES_V3_TIME_RANGE } from '../constants';
import type { BehavioralAnomalyV3TableRow } from '../types';

/**
 * BA-v.2: build a "Single metric viewer" URL targeting a specific anomaly row.
 *
 * Returns `undefined` when the ML plugin is not available, so the caller can
 * decide whether to render a link / fall back to a plain label.
 */
export const useAnomalyV3SingleMetricViewerUrl = (
  row: BehavioralAnomalyV3TableRow
): string | undefined => {
  const {
    services: { http, ml },
  } = useKibana();

  return useMlHref(
    ml,
    http.basePath.get(),
    {
      page: ML_PAGES.SINGLE_METRIC_VIEWER,
      pageState: {
        jobIds: [row.jobId],
        timeRange: {
          from: BEHAVIORAL_ANOMALIES_V3_TIME_RANGE.from,
          to: BEHAVIORAL_ANOMALIES_V3_TIME_RANGE.to,
          mode: 'relative',
        },
        detectorIndex: row.detectorIndex ?? 0,
        entities: row.entities,
      },
    },
    [row.jobId, row.detectorIndex, row.entities]
  );
};
