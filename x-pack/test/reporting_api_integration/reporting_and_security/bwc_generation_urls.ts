/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REPO_ROOT } from '@kbn/utils';
import pathNode from 'path';
import { FtrProviderContext } from '../ftr_provider_context';
import * as GenerationUrls from '../services/generation_urls';

const OSS_KIBANA_ARCHIVE_PATH = pathNode.resolve(
  REPO_ROOT,
  'test/functional/fixtures/es_archiver/dashboard/current/kibana'
);
const OSS_DATA_ARCHIVE_PATH = pathNode.resolve(
  REPO_ROOT,
  'test/functional/fixtures/es_archiver/dashboard/current/data'
);

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const reportingAPI = getService('reportingAPI');

  describe('BWC report generation urls', () => {
    before(async () => {
      await esArchiver.load(OSS_KIBANA_ARCHIVE_PATH);
      await esArchiver.load(OSS_DATA_ARCHIVE_PATH);

      await kibanaServer.uiSettings.update({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await reportingAPI.deleteAllReports();
    });

    // FLAKY: https://github.com/elastic/kibana/issues/93354
    describe.skip('Pre 6_2', () => {
      // The URL being tested was captured from release 6.4 and then the layout section was removed to test structure before
      // preserve_layout was introduced. See https://github.com/elastic/kibana/issues/23414
      it('job posted successfully', async () => {
        const path = await reportingAPI.postJob(GenerationUrls.PDF_PRINT_DASHBOARD_PRE_6_2);
        await reportingAPI.waitForJobToFinish(path);
      }).timeout(500000);
    });

    describe('6_2', () => {
      // Might not be great test practice to lump all these jobs together but reporting takes awhile and it'll be
      // more efficient to post them all up front, then sequentially.
      it('multiple jobs posted', async () => {
        const reportPaths = [];
        reportPaths.push(await reportingAPI.postJob(GenerationUrls.PDF_PRINT_DASHBOARD_6_2));
        reportPaths.push(await reportingAPI.postJob(GenerationUrls.PDF_PRESERVE_VISUALIZATION_6_2));
        reportPaths.push(await reportingAPI.postJob(GenerationUrls.CSV_DISCOVER_FILTER_QUERY_6_2));

        await reportingAPI.expectAllJobsToFinishSuccessfully(reportPaths);
      }).timeout(1540000);
    });

    // 6.3 urls currently being tested as part of the "bwc_existing_indexes" test suite. Reports are time consuming,
    // don't replicate tests if we don't need to, so no specific 6_3 url tests here.
  });
}
