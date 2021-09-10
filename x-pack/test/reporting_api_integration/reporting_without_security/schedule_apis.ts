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
  const supertestNoAuth = getService('supertestWithoutAuth');
  const reportingAPI = getService('reportingAPI');
  const log = getService('log');

  describe('Scheduled Reporting APIs', () => {
    before(async () => {
      await reportingAPI.initEcommerce();
    });

    after(async () => {
      await reportingAPI.teardownEcommerce();
      await reportingAPI.deleteAllReports();
      await reportingAPI.deleteAllSchedules();
    });

    it(`listing API shows the user's schedules`, async () => {
      {
        log.info(`testing that there are no schedules`);
        const list = await supertestNoAuth.get('/api/reporting/schedules/list');
        expect(list.status).eql(200);
        const schedules = JSON.parse(list.text).schedules as ConcreteTaskInstance[];
        expectSnapshot(schedules).toMatchInline(`Array []`);
      }

      log.info(`adding a scheduled report`);
      const scheduleResponse = await reportingAPI.scheduleReport('printablePdfV2', POST_URL, {
        minutes: 2,
      });
      expect(scheduleResponse.status).eql(200);

      log.info('Sleeping...');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      {
        log.info(`testing that the schedule appears in the listing`);
        const list = await supertestNoAuth.get('/api/reporting/schedules/list');
        expect(list.status).eql(200);
        const schedules = JSON.parse(list.text).schedules as ConcreteTaskInstance[];
        const [task] = schedules;
        if (!task) {
          throw new Error(`Listing contained no results!`);
        }

        expectSnapshot(task.taskType).toMatchInline(`"report:execute"`);
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
        const { forceNow, ...payload } = payloadDetails as JobParamsPDFV2 & { forceNow: unknown };
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
            "locatorParams": Array [
              Object {
                "id": "DASHBOARD_APP_LOCATOR",
                "params": Object {
                  "dashboardId": "6c263e00-1c6d-11ea-a100-8589bb9d7c6b",
                  "filters": Array [],
                  "options": Object {
                    "hidePanelTitles": false,
                    "useMargins": true,
                  },
                  "panels": Array [
                    Object {
                      "embeddableConfig": Object {
                        "enhancements": Object {},
                      },
                      "gridData": Object {
                        "h": 15,
                        "i": "1c12c2f2-80c2-4d5c-b722-55b2415006e1",
                        "w": 24,
                        "x": 0,
                        "y": 0,
                      },
                      "id": "0a464230-79f0-11ea-ae7f-13c5d6e410a0",
                      "panelIndex": "1c12c2f2-80c2-4d5c-b722-55b2415006e1",
                      "type": "visualization",
                      "version": "8.0.0",
                    },
                    Object {
                      "embeddableConfig": Object {
                        "enhancements": Object {},
                        "vis": Object {
                          "legendOpen": true,
                        },
                      },
                      "gridData": Object {
                        "h": 15,
                        "i": "1c4b99e1-7785-444f-a1c5-f592893b1a96",
                        "w": 24,
                        "x": 24,
                        "y": 0,
                      },
                      "id": "200609c0-79f0-11ea-ae7f-13c5d6e410a0",
                      "panelIndex": "1c4b99e1-7785-444f-a1c5-f592893b1a96",
                      "type": "visualization",
                      "version": "8.0.0",
                    },
                    Object {
                      "embeddableConfig": Object {
                        "enhancements": Object {},
                      },
                      "gridData": Object {
                        "h": 18,
                        "i": "94eab06f-60ac-4a85-b771-3a8ed475c9bb",
                        "w": 48,
                        "x": 0,
                        "y": 35,
                      },
                      "id": "6091ead0-1c6d-11ea-a100-8589bb9d7c6b",
                      "panelIndex": "94eab06f-60ac-4a85-b771-3a8ed475c9bb",
                      "type": "search",
                      "version": "8.0.0",
                    },
                    Object {
                      "embeddableConfig": Object {
                        "enhancements": Object {},
                      },
                      "gridData": Object {
                        "h": 8,
                        "i": "52c19b6b-7117-42ac-a74e-c507a1c3ffc0",
                        "w": 48,
                        "x": 0,
                        "y": 15,
                      },
                      "id": "4a36acd0-7ac3-11ea-b69c-cf0d7935cd67",
                      "panelIndex": "52c19b6b-7117-42ac-a74e-c507a1c3ffc0",
                      "type": "visualization",
                      "version": "8.0.0",
                    },
                    Object {
                      "embeddableConfig": Object {
                        "enhancements": Object {},
                        "vis": null,
                      },
                      "gridData": Object {
                        "h": 12,
                        "i": "a1e889dc-b80e-4937-a576-979f34d1859b",
                        "w": 16,
                        "x": 0,
                        "y": 23,
                      },
                      "id": "ef8757d0-7ac2-11ea-b69c-cf0d7935cd67",
                      "panelIndex": "a1e889dc-b80e-4937-a576-979f34d1859b",
                      "type": "visualization",
                      "version": "8.0.0",
                    },
                    Object {
                      "embeddableConfig": Object {
                        "enhancements": Object {},
                      },
                      "gridData": Object {
                        "h": 12,
                        "i": "4930b035-d756-4cc5-9a18-1af9e67d6f31",
                        "w": 12,
                        "x": 16,
                        "y": 23,
                      },
                      "id": "132ab9c0-7ac3-11ea-b69c-cf0d7935cd67",
                      "panelIndex": "4930b035-d756-4cc5-9a18-1af9e67d6f31",
                      "type": "visualization",
                      "version": "8.0.0",
                    },
                    Object {
                      "embeddableConfig": Object {
                        "enhancements": Object {},
                      },
                      "gridData": Object {
                        "h": 12,
                        "i": "55112375-d6f0-44f7-a8fb-867c8f7d464d",
                        "w": 20,
                        "x": 28,
                        "y": 23,
                      },
                      "id": "1bba55f0-507e-11eb-9c0d-97106882b997",
                      "panelIndex": "55112375-d6f0-44f7-a8fb-867c8f7d464d",
                      "type": "visualization",
                      "version": "8.0.0",
                    },
                  ],
                  "preserveSavedFilters": true,
                  "query": Object {
                    "language": "kuery",
                    "query": "",
                  },
                  "timeRange": Object {
                    "from": "2019-03-23T03:06:17.785Z",
                    "to": "2019-10-04T02:33:16.708Z",
                  },
                  "useHash": false,
                  "viewMode": "view",
                },
                "version": "8.0.0",
              },
            ],
            "objectType": "dashboard",
            "title": "Ecom Dashboard",
            "version": "8.0.0",
          }
        `);
      }
    });
  });
}
