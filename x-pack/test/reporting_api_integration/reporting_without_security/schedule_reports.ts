/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ScheduleIntervalSchemaType } from '../../../plugins/reporting/server/lib/tasks/scheduling';
import { FtrProviderContext } from '../ftr_provider_context';

const POST_URL = `http://localhost:5620/api/reporting/generate/printablePdfV2?jobParams=%28browserTimezone%3AAmerica%2FPhoenix%2Clayout%3A%28dimensions%3A%28height%3A1492%2Cwidth%3A1611.2000732421875%29%2Cid%3Apreserve_layout%29%2ClocatorParams%3A%21%28%28id%3ADASHBOARD_APP_LOCATOR%2Cparams%3A%28dashboardId%3A%276c263e00-1c6d-11ea-a100-8589bb9d7c6b%27%2Cfilters%3A%21%28%29%2Coptions%3A%28hidePanelTitles%3A%21f%2CuseMargins%3A%21t%29%2Cpanels%3A%21%28%28embeddableConfig%3A%28enhancements%3A%28%29%29%2CgridData%3A%28h%3A15%2Ci%3A%271c12c2f2-80c2-4d5c-b722-55b2415006e1%27%2Cw%3A24%2Cx%3A0%2Cy%3A0%29%2Cid%3A%270a464230-79f0-11ea-ae7f-13c5d6e410a0%27%2CpanelIndex%3A%271c12c2f2-80c2-4d5c-b722-55b2415006e1%27%2Ctype%3Avisualization%2Cversion%3A%278.0.0%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%2Cvis%3A%28legendOpen%3A%21t%29%29%2CgridData%3A%28h%3A15%2Ci%3A%271c4b99e1-7785-444f-a1c5-f592893b1a96%27%2Cw%3A24%2Cx%3A24%2Cy%3A0%29%2Cid%3A%27200609c0-79f0-11ea-ae7f-13c5d6e410a0%27%2CpanelIndex%3A%271c4b99e1-7785-444f-a1c5-f592893b1a96%27%2Ctype%3Avisualization%2Cversion%3A%278.0.0%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%29%2CgridData%3A%28h%3A18%2Ci%3A%2794eab06f-60ac-4a85-b771-3a8ed475c9bb%27%2Cw%3A48%2Cx%3A0%2Cy%3A35%29%2Cid%3A%276091ead0-1c6d-11ea-a100-8589bb9d7c6b%27%2CpanelIndex%3A%2794eab06f-60ac-4a85-b771-3a8ed475c9bb%27%2Ctype%3Asearch%2Cversion%3A%278.0.0%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%29%2CgridData%3A%28h%3A8%2Ci%3A%2752c19b6b-7117-42ac-a74e-c507a1c3ffc0%27%2Cw%3A48%2Cx%3A0%2Cy%3A15%29%2Cid%3A%274a36acd0-7ac3-11ea-b69c-cf0d7935cd67%27%2CpanelIndex%3A%2752c19b6b-7117-42ac-a74e-c507a1c3ffc0%27%2Ctype%3Avisualization%2Cversion%3A%278.0.0%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%2Cvis%3A%21n%29%2CgridData%3A%28h%3A12%2Ci%3Aa1e889dc-b80e-4937-a576-979f34d1859b%2Cw%3A16%2Cx%3A0%2Cy%3A23%29%2Cid%3Aef8757d0-7ac2-11ea-b69c-cf0d7935cd67%2CpanelIndex%3Aa1e889dc-b80e-4937-a576-979f34d1859b%2Ctype%3Avisualization%2Cversion%3A%278.0.0%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%29%2CgridData%3A%28h%3A12%2Ci%3A%274930b035-d756-4cc5-9a18-1af9e67d6f31%27%2Cw%3A12%2Cx%3A16%2Cy%3A23%29%2Cid%3A%27132ab9c0-7ac3-11ea-b69c-cf0d7935cd67%27%2CpanelIndex%3A%274930b035-d756-4cc5-9a18-1af9e67d6f31%27%2Ctype%3Avisualization%2Cversion%3A%278.0.0%27%29%2C%28embeddableConfig%3A%28enhancements%3A%28%29%29%2CgridData%3A%28h%3A12%2Ci%3A%2755112375-d6f0-44f7-a8fb-867c8f7d464d%27%2Cw%3A20%2Cx%3A28%2Cy%3A23%29%2Cid%3A%271bba55f0-507e-11eb-9c0d-97106882b997%27%2CpanelIndex%3A%2755112375-d6f0-44f7-a8fb-867c8f7d464d%27%2Ctype%3Avisualization%2Cversion%3A%278.0.0%27%29%29%2CpreserveSavedFilters%3A%21t%2Cquery%3A%28language%3Akuery%2Cquery%3A%27%27%29%2CtimeRange%3A%28from%3A%272019-03-23T03%3A06%3A17.785Z%27%2Cto%3A%272019-10-04T02%3A33%3A16.708Z%27%29%2CuseHash%3A%21f%2CviewMode%3Aview%29%2Cversion%3A%278.0.0%27%29%29%2CobjectType%3Adashboard%2Ctitle%3A%27Ecom%20Dashboard%27%2Cversion%3A%278.0.0%27%29`;

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertestNoAuth = getService('supertestWithoutAuth');
  const reportingAPI = getService('reportingAPI');
  const log = getService('log');
  const retry = getService('retry');

  const countReportDocuments = async () => {
    const count = await supertestNoAuth.get(`/api/reporting/jobs/count`).set('kbn-xsrf', 'xxx');
    return parseInt(count.text, 10);
  };

  const scheduleReportPdfV2 = async (interval: ScheduleIntervalSchemaType) => {
    return await supertestNoAuth
      .post('/api/reporting/schedule/printablePdfV2')
      .set('kbn-xsrf', 'xxx')
      .send({
        post_url: POST_URL,
        interval,
      });
  };

  describe('Scheduled reports', () => {
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
      const scheduleResponse = await scheduleReportPdfV2({ minutes: 1 });
      expect(scheduleResponse.status).eql(200);

      log.info(`checking for the first report instance`);
      await retry.tryForTime(5000, async () => {
        expect(await countReportDocuments()).eql(1);
      });

      // wait 1 minute for another report job to fire
      log.info(`waiting 1 minute for second report instance to start`);
      await new Promise((resolve) => setTimeout(resolve, 60000));

      log.info(`checking for the second report instance`);
      await retry.tryForTime(5000, async () => {
        expect(await countReportDocuments()).eql(2);
      });
    });
  });
}
