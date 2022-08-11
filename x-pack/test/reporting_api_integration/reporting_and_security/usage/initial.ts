/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { UsageStats } from '../../services/usage';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');
  const retry = getService('retry');
  const usageAPI = getService('usageAPI');

  describe('initial state', () => {
    let usage: UsageStats;

    before(async () => {
      await retry.try(async () => {
        // use retry for stability - usage API could return 503
        usage = (await usageAPI.getUsageStats()) as UsageStats;
      });
    });

    it('shows reporting as available and enabled', async () => {
      expect(usage.reporting.available).to.be(true);
      expect(usage.reporting.enabled).to.be(true);
    });

    it('all counts are 0', async () => {
      reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 0);
      reportingAPI.expectAllTimePdfAppStats(usage, 'visualization', 0);
      reportingAPI.expectRecentPdfAppStats(usage, 'dashboard', 0);
      reportingAPI.expectAllTimePdfAppStats(usage, 'dashboard', 0);
      reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 0);
      reportingAPI.expectAllTimePdfLayoutStats(usage, 'preserve_layout', 0);
      reportingAPI.expectAllTimePdfLayoutStats(usage, 'print', 0);
      reportingAPI.expectRecentPdfLayoutStats(usage, 'print', 0);
      reportingAPI.expectRecentJobTypeTotalStats(usage, 'csv_searchsource', 0);
      reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'csv_searchsource', 0);
      reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 0);
      reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'printable_pdf', 0);
    });
  });
}
