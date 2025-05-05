/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

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
  const kibanaServer = getService('kibanaServer');

  describe('BWC report generation into existing indexes', () => {
    let cleanupIndexAlias: () => Promise<void>;

    describe('existing 6_2 index', () => {
      before('load data and add index alias', async () => {
        await reportingAPI.deleteAllReports();
        // data to report on
        await esArchiver.load(
          'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
        );
        await kibanaServer.importExport.load(
          'src/platform/test/functional/fixtures/kbn_archiver/discover'
        );

        // archive with reporting index mappings v6.2
        await esArchiver.load('x-pack/test/functional/es_archives/reporting/bwc/6_2');

        // The index name in the reporting/bwc/6_2 archive.
        const ARCHIVED_REPORTING_INDEX = '.reporting-2018.03.11';
        // causes reporting to assume the v6.2 index is the one to use for new jobs posted
        cleanupIndexAlias = await reportingAPI.coerceReportsIntoExistingIndex(
          ARCHIVED_REPORTING_INDEX
        );
      });

      after('remove index alias', async () => {
        await esArchiver.unload(
          'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
        );
        await kibanaServer.importExport.unload(
          'src/platform/test/functional/fixtures/kbn_archiver/discover'
        );

        await cleanupIndexAlias();
        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/bwc/6_2');
      });

      it('single job posted can complete in an index created with an older version', async () => {
        const reportPaths = [];
        reportPaths.push(
          await reportingAPI.postJob(
            '/api/reporting/generate/csv_searchsource?jobParams=%28browserTimezone%3AAmerica%2FPhoenix%2Ccolumns%3A%21%28%29%2CobjectType%3Asearch%2CsearchSource%3A%28fields%3A%21%28%28field%3A%27%2A%27%2Cinclude_unmapped%3Atrue%29%29%2Cfilter%3A%21%28%28meta%3A%28index%3A%27logstash-%2A%27%2Cparams%3A%28%29%29%2Crange%3A%28%27%40timestamp%27%3A%28format%3Astrict_date_optional_time%2Cgte%3A%272015-09-20T16%3A00%3A56.290Z%27%2Clte%3A%272015-09-21T10%3A37%3A45.066Z%27%29%29%29%29%2Cindex%3A%27logstash-%2A%27%2Cparent%3A%28filter%3A%21%28%29%2Cindex%3A%27logstash-%2A%27%2Cquery%3A%28language%3Akuery%2Cquery%3A%27%27%29%29%2Csort%3A%21%28%28%27%40timestamp%27%3Adesc%29%29%2CtrackTotalHits%3A%21t%2Cversion%3A%21t%29%2Ctitle%3A%27Discover%20search%20%5B2021-07-30T11%3A47%3A03.731-07%3A00%5D%27%29'
          )
        );
        await reportingAPI.expectAllJobsToFinishSuccessfully(reportPaths);
      }).timeout(1540000);
    });
  });
}
