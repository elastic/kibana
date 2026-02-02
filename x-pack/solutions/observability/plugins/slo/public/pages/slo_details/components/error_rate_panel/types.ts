/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { TimeRange } from '../../../../components/slo/error_rate_chart/use_lens_definition';
import type { TimeBounds } from '../../types';

export interface ErrorRatePanelProps {
  slo: SLOWithSummaryResponse;
  dataTimeRange: TimeRange;
  onBrushed?: (timeBounds: TimeBounds) => void;
}
