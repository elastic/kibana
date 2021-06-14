/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import supertest from 'supertest';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');

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
        const res = (await reportingAPI.downloadCsv(
          reportingAPI.DATA_ANALYST_USERNAME,
          reportingAPI.DATA_ANALYST_PASSWORD,
          {
            searchSource: {
              query: { query: '', language: 'kuery' },
              index: '5193f870-d861-11e9-a311-0fa548c5f953',
              filter: [],
            },
            browserTimezone: 'UTC',
            title: 'testfooyu78yt90-',
          } as any
        )) as supertest.Response;
        expect(res.status).to.eql(403);
      });

      it('does allow user with the role privilege', async () => {
        const res = (await reportingAPI.downloadCsv(
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
          } as any
        )) as supertest.Response;
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
          }
        );
        expect(res.status).to.eql(200);
      });
    });

    describe('Discover: Generate CSV report', () => {
      it('does not allow user that does not have the role-based privilege', async () => {
        const res = await reportingAPI.generateCsv(
          reportingAPI.DATA_ANALYST_USERNAME,
          reportingAPI.DATA_ANALYST_PASSWORD,
          {
            browserTimezone: 'UTC',
            searchSource: {},
            objectType: 'search',
            title: 'test disallowed',
          }
        );
        expect(res.status).to.eql(403);
      });

      it('does allow user with the role-based privilege', async () => {
        const res = await reportingAPI.generateCsv(
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'allowed search',
            objectType: 'search',
            searchSource: {
              version: true,
              fields: [{ field: '*', include_unmapped: 'true' }],
              index: '5193f870-d861-11e9-a311-0fa548c5f953',
            } as any,
            columns: [],
          }
        );
        expect(res.status).to.eql(200);
      });
    });
  });
}
