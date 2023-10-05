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
        await esArchiver.load('test/functional/fixtures/es_archiver/logstash_functional');
        await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');

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
        await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
        await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');

        await cleanupIndexAlias();
        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/bwc/6_2');
      });      
    });
  });
}
