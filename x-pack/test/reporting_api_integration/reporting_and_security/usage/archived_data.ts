/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const reportingAPI = getService('reportingAPI');
  const usageAPI = getService('usageAPI');

  describe('from archive data', () => {
    it('generated from 6.2', async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/bwc/6_2');
      const usage = await usageAPI.getUsageStats();

      reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 0);
      reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'printable_pdf', 7);

      // These statistics weren't tracked until 6.3
      reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 0);
      reportingAPI.expectRecentPdfAppStats(usage, 'dashboard', 0);
      reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 0);
      reportingAPI.expectRecentPdfLayoutStats(usage, 'print', 0);
      reportingAPI.expectAllTimePdfAppStats(usage, 'visualization', 0);
      reportingAPI.expectAllTimePdfAppStats(usage, 'dashboard', 0);
      reportingAPI.expectAllTimePdfLayoutStats(usage, 'preserve_layout', 0);
      reportingAPI.expectAllTimePdfLayoutStats(usage, 'print', 0);

      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/bwc/6_2');
    });

    it('generated from 6.3', async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/bwc/6_3');
      const usage = await usageAPI.getUsageStats();

      reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 0);
      reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 0);
      reportingAPI.expectRecentPdfAppStats(usage, 'dashboard', 0);
      reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 0);
      reportingAPI.expectRecentPdfLayoutStats(usage, 'print', 0);

      reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'printable_pdf', 12);
      reportingAPI.expectAllTimePdfAppStats(usage, 'visualization', 3);
      reportingAPI.expectAllTimePdfAppStats(usage, 'dashboard', 3);
      reportingAPI.expectAllTimePdfLayoutStats(usage, 'preserve_layout', 3);
      reportingAPI.expectAllTimePdfLayoutStats(usage, 'print', 3);

      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/bwc/6_3');
    });
  });
}
