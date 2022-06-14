/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { createPdfV2Params, createPngV2Params } from '..';
import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestUnauth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const usageAPI = getService('usageAPI');
  const reportingAPI = getService('reportingAPI');

  describe(`Usage Counters`, () => {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await reportingAPI.initEcommerce();
    });

    after(async () => {
      await reportingAPI.deleteAllReports();
      await reportingAPI.teardownEcommerce();
    });

    it('configuration settings of the tests_server', async () => {
      const usage = await usageAPI.getUsageStats();
      expect(usage.kibana_config_usage.xpack_reporting_capture_max_attempts).to.be(1);
      expect(usage.kibana_config_usage.xpack_reporting_csv_max_size_bytes).to.be(6000);
      expect(usage.kibana_config_usage.xpack_reporting_roles_enabled).to.be(false);
    });

    describe('API counters: management', () => {
      enum paths {
        LIST = '/api/reporting/jobs/list',
        COUNT = '/api/reporting/jobs/count',
        INFO = '/api/reporting/jobs/info/{docId}',
        ILM = '/api/reporting/ilm_policy_status',
        DIAG_BROWSER = '/api/reporting/diagnose/browser',
        DIAG_SCREENSHOT = '/api/reporting/diagnose/screenshot',
      }

      let initialStats: any;
      let stats: any;
      const CALL_COUNT = 3;

      before('call APIs', async () => {
        initialStats = await usageAPI.getUsageStats();

        await Promise.all(
          Object.keys(paths).map(async (key) => {
            await Promise.all([...Array(CALL_COUNT)].map(() => supertest.get((paths as any)[key])));
          })
        );

        // wait for events to aggregate into the usage stats
        await new Promise((resolve) => {
          setTimeout(resolve, 8000);
        });

        // determine the result usage count
        stats = await usageAPI.getUsageStats();
      });

      it('job listing', async () => {
        expect(getUsageCount(initialStats, `get ${paths.LIST}`)).to.be(0);
        expect(getUsageCount(stats, `get ${paths.LIST}`)).to.be(CALL_COUNT);
      });

      it('job count', async () => {
        expect(getUsageCount(initialStats, `get ${paths.COUNT}`)).to.be(0);
        expect(getUsageCount(stats, `get ${paths.COUNT}`)).to.be(CALL_COUNT);
      });

      it('job info', async () => {
        expect(getUsageCount(initialStats, `get ${paths.INFO}`)).to.be(0);
        expect(getUsageCount(stats, `get ${paths.INFO}`)).to.be(CALL_COUNT);
      });
    });

    describe('downloading and deleting', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/reporting/archived_reports');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/reporting/archived_reports');
      });

      it('downloading', async () => {});

      it('deleting', async () => {
        await supertestUnauth
          .delete('/api/reporting/jobs/delete/krazcyw4156m0763b503j7f9')
          .auth('test_user', 'changeme')
          .set('kbn-xsrf', 'xxx');

        await supertestUnauth
          .delete('/api/reporting/jobs/delete/krazaxch156m0763b5bf81ov')
          .auth('test_user', 'changeme')
          .set('kbn-xsrf', 'xxx');
        // wait for events to aggregate into the usage stats
        await new Promise((resolve) => {
          setTimeout(resolve, 8000);
        });

        // determine the result usage count
        expect(
          getUsageCount(await usageAPI.getUsageStats(), `delete /api/reporting/jobs/delete/{docId}`)
        ).to.be(2);
      });
    });

    describe('API counters: job generation', () => {
      let stats: any;

      before(async () => {
        // call generation APIs
        await Promise.all([
          postCsv(),
          postCsv(),
          postPng(),
          postPng(),
          postPdf(),
          postPdf(),
          postPdf(),
          downloadCsv(),
        ]);

        // wait for events to aggregate into the usage stats
        await new Promise((resolve) => {
          setTimeout(resolve, 8000);
        });

        // determine the result usage count
        stats = await usageAPI.getUsageStats();
      });

      it('PNG', async () => {
        expect(getUsageCount(stats, 'post /api/reporting/generate/pngV2')).to.be(2);
      });

      it('PDF', async () => {
        expect(getUsageCount(stats, 'post /api/reporting/generate/printablePdfV2')).to.be(3);
      });

      it('CSV', async () => {
        expect(getUsageCount(stats, 'post /api/reporting/generate/csv_searchsource')).to.be(2);
      });

      it('Download CSV', async () => {
        expect(
          getUsageCount(stats, 'post /api/reporting/v1/generate/immediate/csv_searchsource')
        ).to.be(1);
      });
    });

    // helpers
    const getUsageCount = (checkUsage: any, counterName: string): number => {
      return (
        checkUsage.usage_counters.daily_events.find(
          (item: any) => item.counter_name === counterName
        )?.total || 0
      );
    };

    const postCsv = () =>
      reportingAPI.postJobJSON(`/api/reporting/generate/csv_searchsource`, {
        jobParams:
          `(browserTimezone:UTC,` +
          `columns:!(order_date,category,customer_full_name,taxful_total_price,currency),objectType:search,searchSource:(fields:!((field:'*',include_unmapped:true))` +
          `,filter:!((meta:(field:order_date,index:aac3e500-f2c7-11ea-8250-fb138aa491e7,params:()),query:(range:(order_date:(format:strict_date_optional_time,gte:'2019-06-02T12:28:40.866Z'` +
          `,lte:'2019-07-18T20:59:57.136Z'))))),index:aac3e500-f2c7-11ea-8250-fb138aa491e7,parent:(filter:!(),highlightAll:!t,index:aac3e500-f2c7-11ea-8250-fb138aa491e7` +
          `,query:(language:kuery,query:''),version:!t),sort:!((order_date:desc)),trackTotalHits:!t)` +
          `)`,
      });

    const postPng = () =>
      reportingAPI.postJobJSON(`/api/reporting/generate/pngV2`, {
        jobParams: createPngV2Params(1600),
      });

    const postPdf = () =>
      reportingAPI.postJobJSON(`/api/reporting/generate/printablePdfV2`, {
        jobParams: createPdfV2Params(1600),
      });

    const downloadCsv = () =>
      reportingAPI.downloadCsv(
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD,
        {
          searchSource: {
            query: { query: '', language: 'kuery' },
            index: '5193f870-d861-11e9-a311-0fa548c5f953',
            filter: [],
          },
          browserTimezone: 'UTC',
          title: 'testfooyu78yt90-',
        }
      );
  });
}
