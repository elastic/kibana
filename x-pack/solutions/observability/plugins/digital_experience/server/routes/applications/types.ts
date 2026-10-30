/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationSummary, TimeSeriesPoint } from '../../../common/types/applications';

/** What one source returns: its applications and every environment it saw in the time range. */
export interface SourceApplications {
  applications: ApplicationSummary[];
  environments: string[];
  /** Page loads over the time range in the selected environment. */
  pageLoadsOverTime: TimeSeriesPoint[];
}
