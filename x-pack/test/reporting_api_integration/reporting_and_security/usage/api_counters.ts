/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const getUsageCount = (checkUsage: any, counterName: string): number => {
  return (
    checkUsage.usage_counters.daily_events.find((item: any) => item.counter_name === counterName)
      ?.total || 0
  );
};

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
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

      let stats: any;

      before('call APIs', async () => {
        // call selected APIs 5 times
        const RUN_TIMES = 5;
        await Promise.all(
          Object.keys(paths).map(async (key) => {
            await Promise.all([...Array(RUN_TIMES)].map(() => supertest.get((paths as any)[key])));
          })
        );

        // wait for events to aggregate into the usage stats
        await new Promise((resolve) => {
          setTimeout(resolve, 8000);
        });

        // determine the result usage count
        stats = await usageAPI.getUsageStats();
      });

      it('usage count of job LISTING', async () => {
        expect(getUsageCount(stats, `get ${paths.LIST}`)).to.be(5); // testing added 5 counts
      });

      it('usage count of job COUNT', async () => {
        expect(getUsageCount(stats, `get ${paths.COUNT}`)).to.be(5); // testing added 5 counts
      });

      it('usage count of job INFO', async () => {
        expect(getUsageCount(stats, `get ${paths.INFO}`)).to.be(5); // testing added 5 counts
      });
    });

    // TODO
    describe('API counters: job generation', () => {});
  });
}
