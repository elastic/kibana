/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

const DASHBOARD = `(browserTimezone:America/Phoenix,layout:(dimensions:(height:1491,width:1597),id:preserve_layout),locatorParams:!((id:DASHBOARD_APP_LOCATOR,params:(dashboardId:'6c263e00-1c6d-11ea-a100-8589bb9d7c6b',preserveSavedFilters:!t,timeRange:(from:'2019-03-23T03:06:17.785Z',to:'2019-10-04T02:33:16.708Z'),useHash:!f,viewMode:view),version:'8.4.0')),objectType:dashboard,title:'Ecom Dashboard',version:'8.4.0')`;
const POST_URL = `http://localhost:5620/api/reporting/generate/printablePdfV2?jobParams=${encodeURIComponent(
  DASHBOARD
)}`;

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const reportingAPI = getService('reportingAPI');
  const log = getService('log');
  const retry = getService('retry');

  const countReportDocuments = async () => {
    const count = await supertest.get(`/api/reporting/jobs/count`).set('kbn-xsrf', 'xxx');
    return parseInt(count.text, 10);
  };

  describe('Scheduled Reports Generation', () => {
    before(async () => {
      await reportingAPI.initEcommerce();
    });

    after(async () => {
      await reportingAPI.teardownEcommerce();
      await reportingAPI.deleteAllReports();
      await reportingAPI.deleteAllSchedules();
    });

    it('creates a report for each triggering of the schedule', async () => {
      // initial count of reports is zero
      log.info(`check that initial count of report documents is 0`);
      expect(await countReportDocuments()).eql(0);

      // schedule a report
      log.info(`scheduling a report to repeat every 1 minute`);
      const scheduleResponse = await reportingAPI.scheduleReport('printablePdfV2', POST_URL, {
        minutes: 1,
      });
      expect(scheduleResponse.status).eql(200);

      log.info(`checking for the first report instance`);
      // takes from 1 to 10 seconds in local development environment
      await retry.tryForTime(60000, async () => {
        expect(await countReportDocuments()).eql(1);
        log.info(`found the first report instance`);
      });

      // wait 1 minute for another report job to fire
      log.info(`sleeping 1 minute for next report instance to start...`);
      await new Promise((resolve) => setTimeout(resolve, 60000));

      log.info(`checking for the second report instance`);
      await retry.tryForTime(60000, async () => {
        expect(await countReportDocuments()).eql(2);
        log.info(`found the second report instance`);
      });
    });
  });
}
