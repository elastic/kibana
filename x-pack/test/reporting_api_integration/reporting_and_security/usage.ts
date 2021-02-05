/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';
import * as GenerationUrls from '../generation_urls';
import { ReportingUsageStats } from '../services';
import { OSS_DATA_ARCHIVE_PATH, OSS_KIBANA_ARCHIVE_PATH } from './constants';

interface UsageStats {
  reporting: ReportingUsageStats;
}

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const reportingAPI = getService('reportingAPI');
  const usageAPI = getService('usageAPI');

  describe('Usage', () => {
    beforeEach(async () => {
      await esArchiver.load(OSS_KIBANA_ARCHIVE_PATH);
      await esArchiver.load(OSS_DATA_ARCHIVE_PATH);

      await kibanaServer.uiSettings.update({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await reportingAPI.deleteAllReports();
    });

    after(async () => {
      await esArchiver.unload(OSS_KIBANA_ARCHIVE_PATH);
      await esArchiver.unload(OSS_DATA_ARCHIVE_PATH);
    });

    afterEach(async () => {
      await reportingAPI.deleteAllReports();
    });

    describe('initial state', () => {
      let usage: UsageStats;

      before(async () => {
        usage = (await usageAPI.getUsageStats()) as UsageStats;
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
        await esArchiver.load('reporting/bwc/6_2');
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

        await esArchiver.unload('reporting/bwc/6_2');
      });

      it('generated from 6.3', async () => {
        await esArchiver.load('reporting/bwc/6_3');
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

        await esArchiver.unload('reporting/bwc/6_3');
      });
    });

    describe('from new jobs posted', () => {
      it('should handle csv', async () => {
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

      it('should handle preserve_layout pdf', async () => {
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

      it('should handle print_layout pdf', async () => {
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

      /* Layout Param is optional for PDF from Visualize
       * These PDFs show up in total PDF, not in per-layout type
       */
      it('allows undefined layout', async () => {
        await reportingAPI.expectAllJobsToFinishSuccessfully(
          await Promise.all([reportingAPI.postJob(GenerationUrls.PDF_VISUALIZE_NO_LAYOUT_7_11)])
        );

        const usage = await usageAPI.getUsageStats();

        reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 1);
        reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 1);
        reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 0);
      });

      it('should handle multiple export types and layouts', async () => {
        // Data from the dashboards/current archive
        await reportingAPI.expectAllJobsToFinishSuccessfully(
          await Promise.all([
            reportingAPI.postJob(GenerationUrls.PDF_PRESERVE_DASHBOARD_7_11),
            reportingAPI.postJob(GenerationUrls.PDF_PRINT_DASHBOARD_7_11),
            reportingAPI.postJob(GenerationUrls.PNG_DASHBOARD_7_11),
            reportingAPI.postJob(GenerationUrls.PDF_VISUALIZE_7_11),
            reportingAPI.postJob(GenerationUrls.PNG_VISUALIZE_7_11),
          ])
        );

        // Add Canvas worksheet saved object (erases the existing .kibana index)
        await esArchiver.load('canvas/reports');

        // Data from the canvas/reports archive
        await reportingAPI.expectAllJobsToFinishSuccessfully(
          await Promise.all([
            reportingAPI.postJob(GenerationUrls.PDF_PRESERVE_CANVAS_7_11),
            reportingAPI.postJob(GenerationUrls.PDF_CANVAS_7_11),
          ])
        );

        const usage = await usageAPI.getUsageStats();

        reportingAPI.expectRecentJobTypeTotalStats(usage, 'csv', 0); // 0
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'png', 2); // 2 PNGs (1 Dashboard, 1 Visualize)
        reportingAPI.expectRecentJobTypeTotalStats(usage, 'printable_pdf', 5); // 5 PDFs (2 Dashboard, 2 Canvas, 1 Visualize)

        reportingAPI.expectRecentPdfAppStats(usage, 'dashboard', 2); // 2 PDFs from Dashboard
        reportingAPI.expectRecentPdfAppStats(usage, 'canvas_workpad', 2); // 2 PDF from Canvas
        reportingAPI.expectRecentPdfAppStats(usage, 'visualization', 1); // 1 PDF from Visualize

        reportingAPI.expectRecentPdfLayoutStats(usage, 'preserve_layout', 3); // 3 Preserve Layout PDFs (1 Dashboard, 1 Visualize, 1 Canvas) [PNG not counted, but is also preserve_layout]
        reportingAPI.expectRecentPdfLayoutStats(usage, 'print', 1); // 1 Print Layout PDF from Dashboard
        reportingAPI.expectRecentPdfLayoutStats(usage, 'canvas', 1); // 1 Canvas Layout PDF from Canvas

        await esArchiver.unload('canvas/reports');
      });
    });
  });
}
