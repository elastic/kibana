/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import * as GenerationUrls from "./generation_urls";

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const reportingAPI = getService('reportingAPI');
  const statsAPI = getService('statsAPI');

  describe('reporting stats', () => {
    before(async () => {
      await reportingAPI.deleteAllReportingIndexes();
    });

    describe('initial stats', () => {
      let stats;

      before(async () => {
        stats = await statsAPI.getStats();
      });

      it('shows reporting as available and enabled', async () => {
        expect(stats.reporting.available).to.be(true);
        expect(stats.reporting.enabled).to.be(true);
      });

      it('is using phantom browser', async () => {
        expect(stats.reporting.browser_type).to.be('phantom');
      });

      it('all counts are 0', async () => {
        reportingAPI.expectRecentPdfAppStats(stats, 'visualization', 0);
        reportingAPI.expectAllTimePdfAppStats(stats, 'visualization', 0);
        reportingAPI.expectRecentPdfAppStats(stats, 'dashboard', 0);
        reportingAPI.expectAllTimePdfAppStats(stats, 'dashboard', 0);
        reportingAPI.expectRecentPdfLayoutStats(stats, 'preserve_layout', 0);
        reportingAPI.expectAllTimePdfLayoutStats(stats, 'preserve_layout', 0);
        reportingAPI.expectAllTimePdfLayoutStats(stats, 'print', 0);
        reportingAPI.expectRecentPdfLayoutStats(stats, 'print', 0);
        reportingAPI.expectRecentJobTypeTotalStats(stats, 'csv', 0);
        reportingAPI.expectAllTimeJobTypeTotalStats(stats, 'csv', 0);
        reportingAPI.expectRecentJobTypeTotalStats(stats, 'printable_pdf', 0);
        reportingAPI.expectAllTimeJobTypeTotalStats(stats, 'printable_pdf', 0);
      });
    });

    describe('includes stats from reporting indexes', () => {
      it('generated from 6.2', async () => {
        await esArchiver.load('reporting/bwc/6_2');
        const stats = await statsAPI.getStats();

        reportingAPI.expectRecentJobTypeTotalStats(stats, 'csv', 0);
        reportingAPI.expectRecentJobTypeTotalStats(stats, 'printable_pdf', 0);

        reportingAPI.expectAllTimeJobTypeTotalStats(stats, 'csv', 1);
        reportingAPI.expectAllTimeJobTypeTotalStats(stats, 'printable_pdf', 7);

        // These statistics weren't tracked until 6.3
        reportingAPI.expectRecentPdfAppStats(stats, 'visualization', 0);
        reportingAPI.expectRecentPdfAppStats(stats, 'dashboard', 0);
        reportingAPI.expectRecentPdfLayoutStats(stats, 'preserve_layout', 0);
        reportingAPI.expectRecentPdfLayoutStats(stats, 'print', 0);
        reportingAPI.expectAllTimePdfAppStats(stats, 'visualization', 0);
        reportingAPI.expectAllTimePdfAppStats(stats, 'dashboard', 0);
        reportingAPI.expectAllTimePdfLayoutStats(stats, 'preserve_layout', 0);
        reportingAPI.expectAllTimePdfLayoutStats(stats, 'print', 0);
      });


      it('generated from 6.3', async () => {
        await esArchiver.load('reporting/bwc/6_3');
        const stats = await statsAPI.getStats();

        reportingAPI.expectRecentJobTypeTotalStats(stats, 'csv', 0);
        reportingAPI.expectRecentJobTypeTotalStats(stats, 'printable_pdf', 0);
        reportingAPI.expectRecentPdfAppStats(stats, 'visualization', 0);
        reportingAPI.expectRecentPdfAppStats(stats, 'dashboard', 0);
        reportingAPI.expectRecentPdfLayoutStats(stats, 'preserve_layout', 0);
        reportingAPI.expectRecentPdfLayoutStats(stats, 'print', 0);

        reportingAPI.expectAllTimeJobTypeTotalStats(stats, 'csv', 3);
        reportingAPI.expectAllTimeJobTypeTotalStats(stats, 'printable_pdf', 19);
        reportingAPI.expectAllTimePdfAppStats(stats, 'visualization', 3);
        reportingAPI.expectAllTimePdfAppStats(stats, 'dashboard', 3);
        reportingAPI.expectAllTimePdfLayoutStats(stats, 'preserve_layout', 3);
        reportingAPI.expectAllTimePdfLayoutStats(stats, 'print', 3);
      });
    });

    describe('stats updated when new jobs are posted', async () => {
      it('post jobs', async () => {
        const reportPaths = [];
        reportPaths.push(await reportingAPI.postJob(GenerationUrls.CSV_DISCOVER_KUERY_AND_FILTER_6_3));
        reportPaths.push(await reportingAPI.postJob(GenerationUrls.PDF_PRESERVE_DASHBOARD_FILTER_6_3));
        reportPaths.push(await reportingAPI.postJob(GenerationUrls.PDF_PRESERVE_PIE_VISUALIZATION_6_3));
        reportPaths.push(await reportingAPI.postJob(GenerationUrls.PDF_PRINT_DASHBOARD_6_3));
        reportPaths.push(await reportingAPI.postJob(
          GenerationUrls.PDF_PRINT_PIE_VISUALIZATION_FILTER_AND_SAVED_SEARCH_6_3));

        await reportingAPI.expectAllJobsToFinishSuccessfully(reportPaths);
      }).timeout(1540000);

      it('stats updated', async () => {
        const stats = await statsAPI.getStats();

        reportingAPI.expectRecentPdfAppStats(stats, 'visualization', 2);
        reportingAPI.expectRecentPdfAppStats(stats, 'dashboard', 2);
        reportingAPI.expectRecentPdfLayoutStats(stats, 'preserve_layout', 2);
        reportingAPI.expectRecentPdfLayoutStats(stats, 'print', 2);
        reportingAPI.expectRecentJobTypeTotalStats(stats, 'csv', 1);
        reportingAPI.expectRecentJobTypeTotalStats(stats, 'printable_pdf', 4);

        reportingAPI.expectAllTimePdfAppStats(stats, 'visualization', 5);
        reportingAPI.expectAllTimePdfAppStats(stats, 'dashboard', 5);
        reportingAPI.expectAllTimePdfLayoutStats(stats, 'preserve_layout', 5);
        reportingAPI.expectAllTimePdfLayoutStats(stats, 'print', 5);
        reportingAPI.expectAllTimeJobTypeTotalStats(stats, 'csv', 4);
        reportingAPI.expectAllTimeJobTypeTotalStats(stats, 'printable_pdf', 23);
      });
    });
  });
}
