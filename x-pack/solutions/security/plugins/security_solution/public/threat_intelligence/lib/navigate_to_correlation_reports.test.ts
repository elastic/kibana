/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/deeplinks-security';
import {
  buildCorrelateReportPath,
  navigateToCorrelateReport,
} from './navigate_to_correlation_reports';

describe('buildCorrelateReportPath', () => {
  it('returns a reportId query with open-or-create enabled by default', () => {
    expect(buildCorrelateReportPath('abc123')).toBe('?reportId=abc123&run=1');
  });

  it('omits run when autoRun is false', () => {
    expect(buildCorrelateReportPath('abc123', false)).toBe('?reportId=abc123');
  });
});

describe('navigateToCorrelateReport', () => {
  it('navigates to the correlation deep link with open-or-create path', async () => {
    const navigateToApp = jest.fn().mockResolvedValue(undefined);

    await navigateToCorrelateReport({ navigateToApp } as never, 'report-1');

    expect(navigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
      deepLinkId: SecurityPageName.threatIntelligenceCorrelation,
      path: '?reportId=report-1&run=1',
    });
  });
});
