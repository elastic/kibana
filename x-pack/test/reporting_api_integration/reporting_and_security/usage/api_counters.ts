/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const usageAPI = getService('usageAPI');
  const reportingAPI = getService('reportingAPI');
  const log = getService('log');

  describe(`API Usage Counters`, () => {
    before(async () => {
      await reportingAPI.initEcommerce();
    });

    after(async () => {
      await reportingAPI.deleteAllReports();
      await reportingAPI.teardownEcommerce();
    });

    it('test server configuration settings', async () => {
      const usage = await usageAPI.getUsageStats();
      expect(usage.kibana_config_usage.xpack_reporting_capture_max_attempts).to.be(1);
      expect(usage.kibana_config_usage.xpack_reporting_csv_max_size_bytes).to.be(6000);
      expect(usage.kibana_config_usage.xpack_reporting_roles_enabled).to.be(false);
    });

    const getUsageCount = (checkUsage: any, counterName: string): number => {
      return (
        checkUsage.usage_counters.daily_events.find(
          (item: any) => item.counter_name === counterName
        )?.total || 0
      );
    };

    it('usage count of job LISTING', async () => {
      const path = '/api/reporting/jobs/list';

      // determine the current usage count
      const initialCount = getUsageCount(await usageAPI.getUsageStats(), `get ${path}`);
      log.debug(`initial listing usage: ${initialCount}`);

      // call the listing api 5 times
      await supertest.get(path);
      await supertest.get(path);
      await supertest.get(path);
      await supertest.get(path);
      await supertest.get(path);

      // wait for events to aggregate into the usage stats
      await new Promise((resolve) => {
        setTimeout(resolve, 8000);
      });

      const postCount = getUsageCount(await usageAPI.getUsageStats(), `get ${path}`);
      log.debug(`current listing usage: ${postCount}`);
      expect(postCount - initialCount).to.be(5); // test added 5 counts
    });

    it('usage count of job COUNT', async () => {
      const path = '/api/reporting/jobs/count';

      // determine the current usage count
      const initialCount = getUsageCount(await usageAPI.getUsageStats(), `get ${path}`);
      log.debug(`initial usage: ${initialCount}`);

      // call the listing api 5 times
      await supertest.get(path);
      await supertest.get(path);
      await supertest.get(path);
      await supertest.get(path);
      await supertest.get(path);

      // wait for events to aggregate into the usage stats
      await new Promise((resolve) => {
        setTimeout(resolve, 8000);
      });

      const postCount = getUsageCount(await usageAPI.getUsageStats(), `get ${path}`);
      log.debug(`current usage: ${postCount}`);
      expect(postCount - initialCount).to.be(5); // test added 5 counts
    });

    it('usage count of job INFO', async () => {
      const path = '/api/reporting/jobs/info/{docId}';

      // determine the current usage count
      const initialCount = getUsageCount(await usageAPI.getUsageStats(), `get ${path}`);
      log.debug(`initial usage: ${initialCount}`);

      // call the listing api 5 times
      await supertest.get('/api/reporting/jobs/info/hugenumber');
      await supertest.get('/api/reporting/jobs/info/blipblorp');
      await supertest.get('/api/reporting/jobs/info/hectortester');
      await supertest.get('/api/reporting/jobs/info/macandcheese');
      await supertest.get('/api/reporting/jobs/info/summersquash');

      // wait for events to aggregate into the usage stats
      await new Promise((resolve) => {
        setTimeout(resolve, 8000);
      });

      const postCount = getUsageCount(await usageAPI.getUsageStats(), `get ${path}`);
      log.debug(`current usage: ${postCount}`);
      expect(postCount - initialCount).to.be(5); // test added 5 counts
    });
  });
}
