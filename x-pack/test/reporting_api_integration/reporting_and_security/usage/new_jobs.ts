/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import * as urls from './_post_urls';

const OSS_KIBANA_ARCHIVE_PATH = 'test/functional/fixtures/kbn_archiver/dashboard/current/kibana';
const OSS_DATA_ARCHIVE_PATH = 'test/functional/fixtures/es_archiver/dashboard/current/data';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const reportingAPI = getService('reportingAPI');
  const usageAPI = getService('usageAPI');

  describe('from new jobs posted', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(OSS_KIBANA_ARCHIVE_PATH);
      await esArchiver.load(OSS_DATA_ARCHIVE_PATH);
      await reportingAPI.initEcommerce();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload(OSS_DATA_ARCHIVE_PATH);
      await reportingAPI.teardownEcommerce();
    });

    it('should handle csv_searchsource', async () => {
      await reportingAPI.expectAllJobsToFinishSuccessfully(
        await Promise.all([reportingAPI.postJob(urls.JOB_PARAMS_CSV_DEFAULT_SPACE)])
      );

      const usage = await usageAPI.getUsageStats();
      reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 0);
      reportingAPI.expectRecentPdfAppStats(usage, 'dashboard', 0);
      reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 0);
      reportingAPI.expectRecentPdfLayoutStats(usage, 'print', 0);
      reportingAPI.expectRecentJobTypeTotalStats(usage, 'csv_searchsource', 1);
      reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 0);
    });

    it('should handle preserve_layout pdf', async () => {
      await reportingAPI.expectAllJobsToFinishSuccessfully(
        await Promise.all([
          reportingAPI.postJob(urls.PDF_PRESERVE_DASHBOARD_FILTER_6_3),
          reportingAPI.postJob(urls.PDF_PRESERVE_PIE_VISUALIZATION_6_3),
        ])
      );

      const usage = await usageAPI.getUsageStats();
      reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 1);
      reportingAPI.expectRecentPdfAppStats(usage, 'dashboard', 1);
      reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 2);
      reportingAPI.expectRecentPdfLayoutStats(usage, 'print', 0);
      reportingAPI.expectRecentJobTypeTotalStats(usage, 'csv_searchsource', 0);
      reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 2);
    });

    it('should handle print_layout pdf', async () => {
      await reportingAPI.expectAllJobsToFinishSuccessfully(
        await Promise.all([
          reportingAPI.postJob(urls.PDF_PRINT_DASHBOARD_6_3),
          reportingAPI.postJob(urls.PDF_PRINT_PIE_VISUALIZATION_FILTER_AND_SAVED_SEARCH_6_3),
        ])
      );

      const usage = await usageAPI.getUsageStats();
      reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 1);
      reportingAPI.expectRecentPdfAppStats(usage, 'dashboard', 1);
      reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 0);
      reportingAPI.expectRecentPdfLayoutStats(usage, 'print', 2);
      reportingAPI.expectRecentJobTypeTotalStats(usage, 'csv_searchsource', 0);
      reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 2);

      reportingAPI.expectAllTimePdfAppStats(usage, 'visualization', 1);
      reportingAPI.expectAllTimePdfAppStats(usage, 'dashboard', 1);
      reportingAPI.expectAllTimePdfLayoutStats(usage, 'preserve_layout', 0);
      reportingAPI.expectAllTimePdfLayoutStats(usage, 'print', 2);
      reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'csv_searchsource', 0);
      reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'printable_pdf', 2);
    });
  });
}
