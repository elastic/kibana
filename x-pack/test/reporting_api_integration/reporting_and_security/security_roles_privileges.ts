/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SerializedSearchSourceFields } from 'src/plugins/data/common';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');
  const supertest = getService('supertest');

  describe('Security Roles and Privileges for Applications', () => {
    before(async () => {
      await reportingAPI.initEcommerce();
    });
    after(async () => {
      await reportingAPI.teardownEcommerce();
      await reportingAPI.deleteAllReports();
    });

    describe('Dashboard: CSV download file', () => {
      it('does not allow user that does not have the role-based privilege', async () => {
        const res = await reportingAPI.downloadCsv(
          reportingAPI.DATA_ANALYST_USERNAME,
          reportingAPI.DATA_ANALYST_PASSWORD,
          {
            searchSource: {
              query: { query: '', language: 'kuery' },
              index: '5193f870-d861-11e9-a311-0fa548c5f953',
              filter: [],
            } as unknown as SerializedSearchSourceFields,
            browserTimezone: 'UTC',
            title: 'testfooyu78yt90-',
          }
        );
        expect(res.status).to.eql(403);
      });

      it('does allow user with the role privilege', async () => {
        const res = await reportingAPI.downloadCsv(
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD,
          {
            searchSource: {
              query: { query: '', language: 'kuery' },
              index: '5193f870-d861-11e9-a311-0fa548c5f953',
              filter: [],
            } as unknown as SerializedSearchSourceFields,
            browserTimezone: 'UTC',
            title: 'testfooyu78yt90-',
          }
        );
        expect(res.status).to.eql(200);
      });
    });

    describe('Dashboard: Generate PDF report', () => {
      it('does not allow user that does not have the role-based privilege', async () => {
        const res = await reportingAPI.generatePdf(
          reportingAPI.DATA_ANALYST_USERNAME,
          reportingAPI.DATA_ANALYST_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'test PDF disallowed',
            layout: { id: 'preserve' },
            relativeUrls: ['/fooyou'],
            objectType: 'dashboard',
            version: '7.14.0',
          }
        );
        expect(res.status).to.eql(403);
      });

      it('does allow user with the role-based privilege', async () => {
        const res = await reportingAPI.generatePdf(
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'test PDF allowed',
            layout: { id: 'preserve' },
            relativeUrls: ['/fooyou'],
            objectType: 'dashboard',
            version: '7.14.0',
          }
        );
        expect(res.status).to.eql(200);
      });
    });

    describe('Visualize: Generate PDF report', () => {
      it('does not allow user that does not have the role-based privilege', async () => {
        const res = await reportingAPI.generatePdf(
          reportingAPI.DATA_ANALYST_USERNAME,
          reportingAPI.DATA_ANALYST_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'test PDF disallowed',
            layout: { id: 'preserve' },
            relativeUrls: ['/fooyou'],
            objectType: 'visualization',
            version: '7.14.0',
          }
        );
        expect(res.status).to.eql(403);
      });

      it('does allow user with the role-based privilege', async () => {
        const res = await reportingAPI.generatePdf(
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'test PDF allowed',
            layout: { id: 'preserve' },
            relativeUrls: ['/fooyou'],
            objectType: 'visualization',
            version: '7.14.0',
          }
        );
        expect(res.status).to.eql(200);
      });
    });

    describe('Canvas: Generate PDF report', () => {
      it('does not allow user that does not have the role-based privilege', async () => {
        const res = await reportingAPI.generatePdf(
          reportingAPI.DATA_ANALYST_USERNAME,
          reportingAPI.DATA_ANALYST_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'test PDF disallowed',
            layout: { id: 'preserve' },
            relativeUrls: ['/fooyou'],
            objectType: 'canvas',
            version: '7.14.0',
          }
        );
        expect(res.status).to.eql(403);
      });

      it('does allow user with the role-based privilege', async () => {
        const res = await reportingAPI.generatePdf(
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'test PDF allowed',
            layout: { id: 'preserve' },
            relativeUrls: ['/fooyou'],
            objectType: 'canvas',
            version: '7.14.0',
          }
        );
        expect(res.status).to.eql(200);
      });
    });

    describe('Discover: Generate CSV report', () => {
      it('does not allow user that does not have the role-based privilege', async () => {
        const res = await reportingAPI.generateCsv(
          {
            browserTimezone: 'UTC',
            searchSource: {} as SerializedSearchSourceFields,
            objectType: 'search',
            title: 'test disallowed',
            version: '7.14.0',
          },
          reportingAPI.DATA_ANALYST_USERNAME,
          reportingAPI.DATA_ANALYST_PASSWORD
        );
        expect(res.status).to.eql(403);
      });

      it('does allow user with the role-based privilege', async () => {
        const res = await reportingAPI.generateCsv(
          {
            browserTimezone: 'UTC',
            title: 'allowed search',
            objectType: 'search',
            searchSource: {
              version: true,
              fields: [{ field: '*', include_unmapped: 'true' }],
              index: '5193f870-d861-11e9-a311-0fa548c5f953',
            } as unknown as SerializedSearchSourceFields,
            columns: [],
            version: '7.13.0',
          },
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD
        );
        expect(res.status).to.eql(200);
      });
    });

    // This tests the same API as x-pack/test/api_integration/apis/security/privileges.ts, but it uses the non-deprecated config
    it('should register reporting privileges with the security privileges API', async () => {
      await supertest
        .get('/api/security/privileges')
        .set('kbn-xsrf', 'xxx')
        .send()
        .expect(200)
        .expect((res) => {
          expect(res.body.features.canvas).match(/generate_report/);
          expect(res.body.features.dashboard).match(/download_csv_report/);
          expect(res.body.features.dashboard).match(/generate_report/);
          expect(res.body.features.discover).match(/generate_report/);
          expect(res.body.features.visualize).match(/generate_report/);
        });
    });
  });
}
