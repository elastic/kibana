/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ReportingUsageType } from '@kbn/reporting-plugin/server/usage/types';
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

  describe(`metrics and stats`, () => {
    let reporting: ReportingUsageType;
    let last7Days: ReportingUsageType['last7Days'];

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(OSS_KIBANA_ARCHIVE_PATH);
      await esArchiver.load(OSS_DATA_ARCHIVE_PATH);
      await reportingAPI.initEcommerce();

      await reportingAPI.expectAllJobsToFinishSuccessfully(
        await Promise.all([
          reportingAPI.postJob(urls.PDF_PRINT_DASHBOARD_6_3),
          reportingAPI.postJob(urls.PDF_PRINT_PIE_VISUALIZATION_FILTER_AND_SAVED_SEARCH_6_3),
          reportingAPI.postJob(urls.JOB_PARAMS_CSV_DEFAULT_SPACE),
        ])
      );

      const [{ stats }] = await usageAPI.getTelemetryStats({ unencrypted: true });
      reporting = stats.stack_stats.kibana.plugins.reporting;
      ({ last7Days } = reporting);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload(OSS_DATA_ARCHIVE_PATH);
      await reportingAPI.teardownEcommerce();
    });

    it('includes report stats', async () => {
      // over all time
      expect(reporting._all).to.eql(3);
      expect(reporting.output_size).keys(['1.0', '25.0', '50.0', '5.0', '75.0', '95.0', '99.0']);
      expectSnapshot(reporting.status).toMatchInline(`
        Object {
          "completed": 3,
          "failed": 0,
        }
      `);

      // over last 7 days
      expect(last7Days._all).to.eql(3);
      expect(last7Days.output_size).keys(['1.0', '25.0', '50.0', '5.0', '75.0', '95.0', '99.0']);
      expectSnapshot(last7Days.status).toMatchInline(`
        Object {
          "completed": 3,
          "failed": 0,
        }
      `);
    });

    it('includes report statuses', async () => {
      expectSnapshot(reporting.statuses).toMatchInline(`Object {}`);

      expectSnapshot(last7Days.statuses).toMatchInline(`Object {}`);
    });

    it('includes report metrics (not for job types under last_7_days)', async () => {
      expect(reporting.printable_pdf.output_size).keys([
        '1.0',
        '25.0',
        '50.0',
        '5.0',
        '75.0',
        '95.0',
        '99.0',
      ]);
      expectSnapshot(reporting.printable_pdf.metrics?.pdf_pages).toMatchInline(`
        Object {
          "values": Object {
            "50.0": 1,
            "75.0": 1,
            "95.0": 1,
            "99.0": 1,
          },
        }
      `);
      expectSnapshot(reporting.csv_searchsource.metrics?.csv_rows).toMatchInline(`
        Object {
          "values": Object {
            "50.0": 71,
            "75.0": 71,
            "95.0": 71,
            "99.0": 71,
          },
        }
      `);
    });
  });
}
