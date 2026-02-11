/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetPreviewDataResponse } from '@kbn/slo-schema';
import type { TimeBounds } from '../../types';

export type GetPreviewDataResponseResults = GetPreviewDataResponse['results'];

export interface EventsChartPanelProps {
  range: { from: Date; to: Date };
  hideRangeDurationLabel?: boolean;
  onBrushed?: (timeBounds: TimeBounds) => void;
}
