/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ConcreteTaskInstance } from '../../../plugins/task_manager/server';
import { FtrProviderContext } from '../ftr_provider_context';
import { PDF_V2_DASHBOARD_ECOMMERCE } from '../services/generation_urls';

const POST_URL = `http://localhost:5601${PDF_V2_DASHBOARD_ECOMMERCE}`;
const exportType = 'printablePdfV2';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const reportingAPI = getService('reportingAPI');
  const log = getService('log');

  describe('Scheduled Reporting APIs', () => {
    let testUserName: string;
    let testUserPassword: string;
    before(async () => {
      await reportingAPI.createTestReportingUserRole();
      await reportingAPI.createTestReportingUser();
      await reportingAPI.deleteAllSchedules();
      await reportingAPI.initEcommerce();

      ({ username: testUserName, password: testUserPassword } =
        reportingAPI.getTestReportingUserAuth());
    });

    after(async () => {
      await reportingAPI.teardownEcommerce();
    });

    afterEach(async () => {
      await reportingAPI.deleteAllReports();
      await reportingAPI.deleteAllSchedules();
    });

    it(`listing API`, async () => {
      {
        log.info(`adding a scheduled report under the 'elastic' user`);
        const scheduleResponse = await reportingAPI.scheduleReport(exportType, POST_URL, {
          minutes: 2,
        });
        expect(scheduleResponse.status).eql(200);
        const schedule = JSON.parse(scheduleResponse.text).schedule;
        expect(schedule.params.created_by).eql('elastic');
      }

      {
        log.info(`adding a scheduled report under the '${testUserName}' user`);
        const scheduleResponse = await reportingAPI.scheduleReport(
          exportType,
          POST_URL,
          { minutes: 2 },
          { username: testUserName, password: testUserPassword }
        );
        expect(scheduleResponse.status).eql(200);
        const schedule = JSON.parse(scheduleResponse.text).schedule;
        expect(schedule.params.created_by).eql(testUserName);
      }

      {
        log.info(`testing that 'elastic' user only sees their schedules`);
        const list = await supertest
          .get('/api/reporting/schedules/list')
          .auth('elastic', 'changeme');
        expect(list.status).eql(200);
        const schedules = JSON.parse(list.text).schedules as ConcreteTaskInstance[];
        const users = schedules.map((t) => t.params.created_by);
        expectSnapshot(users).toMatchInline(`
          Array [
            "elastic",
          ]
        `);
        expect(schedules.length).eql(1);
      }

      {
        log.info(`testing that '${testUserName}' user only sees their schedules`);
        const list = await supertest
          .get('/api/reporting/schedules/list')
          .auth(testUserName, testUserPassword);
        expect(list.status).eql(200);
        const schedules = JSON.parse(list.text).schedules as ConcreteTaskInstance[];
        const users = schedules.map((t) => t.params.created_by);
        expectSnapshot(users).toMatchInline(`
          Array [
            "reporting_user",
          ]
        `);
        expect(schedules.length).eql(1);
      }
    });

    it(`delete API`, async () => {
      let scheduleIdTestUser: string;
      let scheduleIdElastic: string;

      {
        log.info(`adding a scheduled report under the 'elastic' user`);
        const scheduleResponse = await reportingAPI.scheduleReport(exportType, POST_URL, {
          minutes: 2,
        });
        expect(scheduleResponse.status).eql(200);
        const schedule = JSON.parse(scheduleResponse.text).schedule;
        scheduleIdElastic = schedule.id;
        expect(schedule.params.created_by).eql('elastic');
      }

      {
        log.info(`adding a scheduled report under the 'reporting_user' user`);
        const scheduleResponse = await reportingAPI.scheduleReport(
          exportType,
          POST_URL,
          { minutes: 2 },
          { username: testUserName, password: testUserPassword }
        );
        expect(scheduleResponse.status).eql(200);
        const schedule = JSON.parse(scheduleResponse.text).schedule;
        scheduleIdTestUser = schedule.id;
        expect(schedule.params.created_by).eql(testUserName);
        log.info(`received id ${scheduleIdTestUser} for scheduled report task`);
      }

      {
        log.info(`testing that 'reporting_user' can not delete the 'elastic' schedule`);
        const deleted = await supertest
          .delete(`/api/reporting/schedules/delete/${scheduleIdElastic}`)
          .set('kbn-xsrf', 'xxx')
          .auth(testUserName, testUserPassword);
        expectSnapshot(deleted.text).toMatchInline(
          `"{\\"statusCode\\":404,\\"error\\":\\"Not Found\\",\\"message\\":\\"Not Found\\"}"`
        );
      }

      {
        log.info(`testing that 'elastic' can not delete the 'reporting_user' schedule`);
        const deleted = await supertest
          .delete(`/api/reporting/schedules/delete/${scheduleIdTestUser}`)
          .set('kbn-xsrf', 'xxx')
          .auth('elastic', 'changeme');
        expectSnapshot(deleted.text).toMatchInline(
          `"{\\"statusCode\\":404,\\"error\\":\\"Not Found\\",\\"message\\":\\"Not Found\\"}"`
        );
      }

      {
        log.info(`testing that 'reporting_user' can delete their own schedule`);
        const deleted = await supertest
          .delete(`/api/reporting/schedules/delete/${scheduleIdTestUser}`)
          .set('kbn-xsrf', 'xxx')
          .auth(testUserName, testUserPassword);
        expectSnapshot(deleted.text).toMatchInline(`"{\\"deleted\\":true}"`);
      }

      {
        log.info(`testing that 'elastic' can delete their own schedule`);
        const deleted = await supertest
          .delete(`/api/reporting/schedules/delete/${scheduleIdElastic}`)
          .set('kbn-xsrf', 'xxx')
          .auth('elastic', 'changeme');
        expectSnapshot(deleted.text).toMatchInline(`"{\\"deleted\\":true}"`);
      }
    });
  });
}
