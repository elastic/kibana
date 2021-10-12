/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ReportApiJSON } from '../../../plugins/reporting/common/types';
import { JobParamsPDFV2 } from '../../../plugins/reporting/server/export_types/printable_pdf_v2/types';
import { ConcreteTaskInstance } from '../../../plugins/task_manager/server';
import { FtrProviderContext } from '../ftr_provider_context';
import { PDF_V2_DASHBOARD_ECOMMERCE } from '../services/generation_urls';

const POST_URL = `http://localhost:5601${PDF_V2_DASHBOARD_ECOMMERCE}`;

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const reportingAPI = getService('reportingAPI');
  const log = getService('log');

  describe('Scheduled Reporting APIs', () => {
    before(async () => {
      await reportingAPI.initEcommerce();
    });

    after(async () => {
      await reportingAPI.teardownEcommerce();
      await reportingAPI.deleteAllSchedules();
    });

    it(`listing API`, async () => {
      {
        log.info(`testing that there are no schedules`);
        const list = await supertest.get('/api/reporting/schedules/list');
        expect(list.status).eql(200);
        const schedules = JSON.parse(list.text).schedules as ConcreteTaskInstance[];
        expectSnapshot(schedules).toMatchInline(`Array []`);
      }

      {
        log.info(`adding a scheduled report`);
        const scheduleResponse = await reportingAPI.scheduleReport('printablePdfV2', POST_URL, {
          minutes: 2,
        });
        expect(scheduleResponse.status).eql(200);
        const {
          schedule: { params, id, runAt, scheduledAt, traceparent, version, ...schedule },
        } = JSON.parse(scheduleResponse.text);
        expectSnapshot(schedule).toMatchInline(`
          Object {
            "attempts": 0,
            "retryAt": null,
            "scope": Array [
              "scheduled-reports",
            ],
            "startedAt": null,
            "state": Object {},
            "status": "idle",
            "taskType": "report:execute",
          }
        `);
      }

      {
        log.info(`testing that the schedule appears in the listing`);
        const list = await supertest.get('/api/reporting/schedules/list');
        expect(list.status).eql(200);
        const schedules = JSON.parse(list.text).schedules as ConcreteTaskInstance[];
        const [task] = schedules;
        if (!task) {
          throw new Error(`Listing contained no results!`);
        }

        const pdfJob = task.params as ReportApiJSON;
        expect(pdfJob.created_by).eql(false);
        expect(pdfJob.jobtype).eql('printable_pdf_v2');
        expectSnapshot(pdfJob.interval).toMatchInline(`
          Object {
            "minutes": 2,
          }
        `);

        const { payload: payloadDetails, ...jobDetails } = pdfJob;
        const { created_at: createdAt, id, ...job } = jobDetails;
        expectSnapshot(job).toMatchInline(`
          Object {
            "attempts": 0,
            "created_by": false,
            "interval": Object {
              "minutes": 2,
            },
            "jobtype": "printable_pdf_v2",
            "meta": Object {
              "objectType": "unknown",
            },
            "migration_version": "7.14.0",
            "output": Object {},
            "status": "pending",
          }
        `);
        const { forceNow, locatorParams, ...payload } = payloadDetails as JobParamsPDFV2 & {
          forceNow: unknown;
        };
        expectSnapshot(payload).toMatchInline(`
          Object {
            "browserTimezone": "America/Phoenix",
            "layout": Object {
              "dimensions": Object {
                "height": 1492,
                "width": 1611.20007324219,
              },
              "id": "preserve_layout",
            },
            "objectType": "dashboard",
            "title": "Ecom Dashboard",
            "version": "8.0.0",
          }
        `);
      }
    });

    it(`delete API`, async () => {
      const exportType = 'printablePdfV2';

      log.info(`adding a scheduled report`);
      const scheduleResponse = await reportingAPI.scheduleReport(exportType, POST_URL, {
        minutes: 2,
      });
      expect(scheduleResponse.status).eql(200);
      const schedule = JSON.parse(scheduleResponse.text).schedule;
      const scheduleId = schedule.id;
      log.info(`created schedule ${scheduleId}`);

      expect(schedule.user).eql(undefined);
      expect(schedule.params.created_by).to.eql(false);

      log.info(`testing that schedule can be deleted`);
      const deleted = await supertest
        .delete(`/api/reporting/schedule/delete/${scheduleId}`)
        .set('kbn-xsrf', 'xxx');
      expectSnapshot(deleted.text).toMatchInline(`"{\\"deleted\\":true}"`);
    });
  });
}
