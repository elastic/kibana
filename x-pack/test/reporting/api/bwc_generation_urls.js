/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as GenerationUrls from './generation_urls';

export default function({ getService }) {
  const reportingAPI = getService('reportingAPI');
  const usageAPI = getService('usageAPI');

  describe('BWC report generation urls', () => {
    describe('Pre 6_2', () => {
      before(async () => {
        await reportingAPI.deleteAllReportingIndexes();
      });

      // The URL being tested was captured from release 6.4 and then the layout section was removed to test structure before
      // preserve_layout was introduced. See https://github.com/elastic/kibana/issues/23414
      it('job posted successfully', async () => {
        const path = await reportingAPI.postJob(GenerationUrls.PDF_PRINT_DASHBOARD_PRE_6_2);
        await reportingAPI.waitForJobToFinish(path);
        const stats = await usageAPI.getUsageStats();
        reportingAPI.expectCompletedReportCount(stats, 1);
      }).timeout(500000);
    });

    describe('6_2', () => {
      before(async () => {
        await reportingAPI.deleteAllReportingIndexes();
      });

      // Might not be great test practice to lump all these jobs together but reporting takes awhile and it'll be
      // more efficient to post them all up front, then sequentially.
      it('multiple jobs posted', async () => {
        const reportPaths = [];
        reportPaths.push(await reportingAPI.postJob(GenerationUrls.PDF_PRINT_DASHBOARD_6_2));
        reportPaths.push(await reportingAPI.postJob(GenerationUrls.PDF_PRESERVE_VISUALIZATION_6_2));
        reportPaths.push(await reportingAPI.postJob(GenerationUrls.CSV_DISCOVER_FILTER_QUERY_6_2));

        await reportingAPI.expectAllJobsToFinishSuccessfully(reportPaths);
      }).timeout(1540000);

      it('jobs completed successfully', async () => {
        const stats = await usageAPI.getUsageStats();
        reportingAPI.expectCompletedReportCount(stats, 3);
      });
    });

    // 6.3 urls currently being tested as part of the "bwc_existing_indexes" test suite. Reports are time consuming,
    // don't replicate tests if we don't need to, so no specific 6_3 url tests here.
  });
}
