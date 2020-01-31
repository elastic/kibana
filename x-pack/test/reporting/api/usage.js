/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import * as GenerationUrls from './generation_urls';

export default function({ getService }) {
  const esArchiver = getService('esArchiver');
  const reportingAPI = getService('reportingAPI');
  const usageAPI = getService('usageAPI');

  describe('reporting usage', () => {
    before(() => reportingAPI.deleteAllReportingIndexes());
    afterEach(() => reportingAPI.deleteAllReportingIndexes());

    describe('initial state', () => {
      let usage;

      before(async () => {
        usage = await usageAPI.getUsageStats();
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
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'csv', 0);
        reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'csv', 0);
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 0);
        reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'printable_pdf', 0);
      });
    });

    describe('from archive data', () => {
      it('generated from 6.2', async () => {
        await esArchiver.load('bwc/6_2');
        const usage = await usageAPI.getUsageStats();

        reportingAPI.expectRecentJobTypeTotalStats(usage, 'csv', 0);
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 0);

        reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'csv', 1);
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
      });

      it('generated from 6.3', async () => {
        await esArchiver.load('bwc/6_3');
        const usage = await usageAPI.getUsageStats();

        reportingAPI.expectRecentJobTypeTotalStats(usage, 'csv', 0);
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 0);
        reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 0);
        reportingAPI.expectRecentPdfAppStats(usage, 'dashboard', 0);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 0);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'print', 0);

        reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'csv', 2);
        reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'printable_pdf', 12);
        reportingAPI.expectAllTimePdfAppStats(usage, 'visualization', 3);
        reportingAPI.expectAllTimePdfAppStats(usage, 'dashboard', 3);
        reportingAPI.expectAllTimePdfLayoutStats(usage, 'preserve_layout', 3);
        reportingAPI.expectAllTimePdfLayoutStats(usage, 'print', 3);
      });
    });

    describe('from new jobs posted', () => {
      it('csv', async () => {
        await reportingAPI.expectAllJobsToFinishSuccessfully(
          await Promise.all([
            reportingAPI.postJob(GenerationUrls.CSV_DISCOVER_KUERY_AND_FILTER_6_3),
          ])
        );

        const usage = await usageAPI.getUsageStats();
        reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 0);
        reportingAPI.expectRecentPdfAppStats(usage, 'dashboard', 0);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 0);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'print', 0);
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'csv', 1);
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 0);
      });

      it('preserve_layout pdf', async () => {
        await reportingAPI.expectAllJobsToFinishSuccessfully(
          await Promise.all([
            reportingAPI.postJob(GenerationUrls.PDF_PRESERVE_DASHBOARD_FILTER_6_3),
            reportingAPI.postJob(GenerationUrls.PDF_PRESERVE_PIE_VISUALIZATION_6_3),
          ])
        );

        const usage = await usageAPI.getUsageStats();
        reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 1);
        reportingAPI.expectRecentPdfAppStats(usage, 'dashboard', 1);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 2);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'print', 0);
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'csv', 0);
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 2);
      });

      it('print_layout pdf', async () => {
        await reportingAPI.expectAllJobsToFinishSuccessfully(
          await Promise.all([
            reportingAPI.postJob(GenerationUrls.PDF_PRINT_DASHBOARD_6_3),
            reportingAPI.postJob(
              GenerationUrls.PDF_PRINT_PIE_VISUALIZATION_FILTER_AND_SAVED_SEARCH_6_3
            ),
          ])
        );

        const usage = await usageAPI.getUsageStats();
        reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 1);
        reportingAPI.expectRecentPdfAppStats(usage, 'dashboard', 1);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 0);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'print', 2);
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'csv', 0);
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 2);

        reportingAPI.expectAllTimePdfAppStats(usage, 'visualization', 1);
        reportingAPI.expectAllTimePdfAppStats(usage, 'dashboard', 1);
        reportingAPI.expectAllTimePdfLayoutStats(usage, 'preserve_layout', 0);
        reportingAPI.expectAllTimePdfLayoutStats(usage, 'print', 2);
        reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'csv', 0);
        reportingAPI.expectAllTimeJobTypeTotalStats(usage, 'printable_pdf', 2);
      });
    });
  });
}
