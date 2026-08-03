/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import { SecurityPageName } from '@kbn/deeplinks-security';

/** Query param that prefills Correlation Reports with a stored report id. */
export const CORRELATION_REPORT_ID_PARAM = 'reportId';

/**
 * When set to `1`, Correlation Reports opens the latest run for `reportId`,
 * or starts a new full-depth run when none exists.
 */
export const CORRELATION_AUTO_RUN_PARAM = 'run';

export const buildCorrelateReportPath = (reportId: string, autoRun = true): string => {
  const params = new URLSearchParams();
  params.set(CORRELATION_REPORT_ID_PARAM, reportId);
  if (autoRun) {
    params.set(CORRELATION_AUTO_RUN_PARAM, '1');
  }
  return `?${params.toString()}`;
};

/**
 * Navigate to Correlation Reports with a report id prefilled and open-or-create enabled.
 */
export const navigateToCorrelateReport = async (
  application: ApplicationStart,
  reportId: string
): Promise<void> => {
  await application.navigateToApp('securitySolutionUI', {
    deepLinkId: SecurityPageName.threatIntelligenceCorrelation,
    path: buildCorrelateReportPath(reportId, true),
  });
};
