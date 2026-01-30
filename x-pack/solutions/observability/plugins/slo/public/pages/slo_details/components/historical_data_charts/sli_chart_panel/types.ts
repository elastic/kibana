/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { ChartData } from '../../../../../typings/slo';
import type { TimeBounds } from '../../../types';

export interface SliChartPanelProps {
  data: ChartData[];
  isLoading: boolean;
  slo: SLOWithSummaryResponse;
  onBrushed?: (timeBounds: TimeBounds) => void;
  hideHeaderDurationLabel?: boolean;
}
