/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import * as GenerationUrls from '../generation_urls';

/**
 * This file tests the situation when a reporting index spans releases. By default reporting indexes are created
 * on a weekly basis, but this is configurable so it is possible a user has this set to yearly. In that event, it
 * is possible report data is getting posted to an index that was created by a very old version. We don't have a
 * reporting index migration plan, so this test is important to ensure BWC, or that in the event we decide to make
 * a major change in a major release, we handle it properly.
 */

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const reportingAPI = getService('reportingAPI');

  // FLAKY: https://github.com/elastic/kibana/issues/42725
  describe.skip('BWC report generation into existing indexes', () => {
    let cleanupIndexAlias: () => Promise<void>;

    describe('existing 6_2 index', () => {
      before('load data and add index alias', async () => {
        await reportingAPI.deleteAllReports();
        await esArchiver.load('reporting/bwc/6_2');

        // The index name in the 6_2 archive.
        const ARCHIVED_REPORTING_INDEX = '.reporting-2018.03.11';
        cleanupIndexAlias = await reportingAPI.coerceReportsIntoExistingIndex(
          ARCHIVED_REPORTING_INDEX
        );

        await esArchiver.unload('reporting/bwc/6_2');
      });

      after('remove index alias', async () => {
        await cleanupIndexAlias();
      });

      it('multiple jobs posted', async () => {
        const reportPaths = [];
        reportPaths.push(
          await reportingAPI.postJob(GenerationUrls.CSV_DISCOVER_KUERY_AND_FILTER_6_3)
        );
        reportPaths.push(
          await reportingAPI.postJob(
            GenerationUrls.PDF_PRINT_PIE_VISUALIZATION_FILTER_AND_SAVED_SEARCH_6_3
          )
        );
        await reportingAPI.expectAllJobsToFinishSuccessfully(reportPaths);
      }).timeout(1540000);
    });
  });
}
