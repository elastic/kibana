/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ClassicRumTimeRange {
  rangeFrom: string;
  rangeTo: string;
}

export interface ClassicRumDashboardProps {
  serviceName: string;
  /** Environment selected in the host app when the dashboard opens; all environments when unset. */
  environment?: string;
  /** Time range owned by the host app; the dashboard falls back to the global timefilter. */
  timeRange?: ClassicRumTimeRange;
  /** Called when the user changes the time range from the dashboard's own date picker. */
  onTimeRangeChange?: (timeRange: ClassicRumTimeRange) => void;
}
