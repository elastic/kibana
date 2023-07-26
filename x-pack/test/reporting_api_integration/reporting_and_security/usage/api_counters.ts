/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { INTERNAL_ROUTES, PUBLIC_ROUTES } from '@kbn/reporting-plugin/common/constants/routes';
import { FtrProviderContext } from '../../ftr_provider_context';
import { UsageStatsPayloadTestFriendly } from '../../../api_integration/services/usage_api';

// helpers
const waitOnAggregation = async () => {
  await new Promise((resolve) => {
    setTimeout(resolve, 8000);
  });
};

const getUsageCount = (checkUsage: UsageStatsPayloadTestFriendly, counterName: string): number => {
  return (
    checkUsage.stack_stats.kibana.plugins.usage_counters.dailyEvents.find(
      (item: any) => item.counterName === counterName
    )?.total || 0
  );
};

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const usageAPI = getService('usageAPI');
  const reportingAPI = getService('reportingAPI');

  describe(`Usage Counters`, () => {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await reportingAPI.initEcommerce();
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/archived_reports');
    });

    after(async () => {
      await reportingAPI.deleteAllReports();
      await reportingAPI.teardownEcommerce();
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/archived_reports');
    });

    describe('API counters: management', () => {
      const paths = {
        LIST: INTERNAL_ROUTES.JOBS.LIST,
        COUNT: INTERNAL_ROUTES.JOBS.COUNT,
        INFO: INTERNAL_ROUTES.JOBS.INFO_PREFIX + '/kraz0qle154g0763b569zz83', // required report stored in archived_reports
      };

      let initialStats: UsageStatsPayloadTestFriendly;
      let stats: UsageStatsPayloadTestFriendly;

      before(async () => {
        [{ stats: initialStats }] = await usageAPI.getTelemetryStats({ unencrypted: true });

        // call APIs to increment counters
        await Promise.all(
          Object.keys(paths).map(async (key) => {
            await supertest
              .get(paths[key as keyof typeof paths])
              .auth('test_user', 'changeme')
              .expect(200);
          })
        );

        // wait for events to aggregate into the usage stats
        await waitOnAggregation();

        // determine the result usage count
        [{ stats }] = await usageAPI.getTelemetryStats({ unencrypted: true });
      });

      it('job listing', async () => {
        const initialCount = getUsageCount(initialStats, `get ${paths.LIST}`);
        expect(getUsageCount(stats, `get ${paths.LIST}`)).to.be(initialCount + 1);
      });

      it('job count', async () => {
        const initialCount = getUsageCount(initialStats, `get ${paths.COUNT}`);
        expect(getUsageCount(stats, `get ${paths.COUNT}`)).to.be(initialCount + 1);
      });

      it('job info', async () => {
        const initialCount = getUsageCount(
          initialStats,
          `get ${INTERNAL_ROUTES.JOBS.INFO_PREFIX}/{docId}:printable_pdf`
        );
        expect(
          getUsageCount(stats, `get ${INTERNAL_ROUTES.JOBS.INFO_PREFIX}/{docId}:printable_pdf`)
        ).to.be(initialCount + 1);
      });
    });

    describe('API counters: job generation', () => {
      let stats: UsageStatsPayloadTestFriendly;

      before(async () => {
        // call generation APIs
        await reportingAPI.postJobJSON(`${PUBLIC_ROUTES.GENERATE_PREFIX}/csv_searchsource`, {
          jobParams:
            `(browserTimezone:UTC,` +
            `columns:!(order_date,category,customer_full_name,taxful_total_price,currency),objectType:search,searchSource:(fields:!((field:'*',include_unmapped:true))` +
            `,filter:!((meta:(field:order_date,index:aac3e500-f2c7-11ea-8250-fb138aa491e7,params:()),query:(range:(order_date:(format:strict_date_optional_time,gte:'2019-06-02T12:28:40.866Z'` +
            `,lte:'2019-07-18T20:59:57.136Z'))))),index:aac3e500-f2c7-11ea-8250-fb138aa491e7,parent:(filter:!(),highlightAll:!t,index:aac3e500-f2c7-11ea-8250-fb138aa491e7` +
            `,query:(language:kuery,query:''),version:!t),sort:!((order_date:desc)),trackTotalHits:!t)` +
            `)`,
        });
        await waitOnAggregation();
        [{ stats }] = await usageAPI.getTelemetryStats({ unencrypted: true });
      });

      it('CSV', async () => {
        expect(
          getUsageCount(stats, `post ${PUBLIC_ROUTES.GENERATE_PREFIX}/csv_searchsource`)
        ).to.be(1);
      });
    });
  });
}
