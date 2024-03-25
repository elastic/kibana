/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import supertest from 'supertest';
import { createPdfV2Params, createPngV2Params } from '.';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');
  const retry = getService('retry');
  const log = getService('log');
  const supertestSvc = getService('supertest');

  const status = (downloadReportPath: string, response: supertest.Response) => {
    if (response.status === 503) {
      log.debug(`Report at path ${downloadReportPath} is pending`);
    } else if (response.status === 200) {
      log.debug(`Report at path ${downloadReportPath} is complete`);
    } else {
      log.debug(`Report at path ${downloadReportPath} returned code ${response.status}`);
    }
  };

  describe('Job parameter validation', () => {
    before(async () => {
      await reportingAPI.initEcommerce();
    });

    after(async () => {
      await reportingAPI.teardownEcommerce();
      await reportingAPI.deleteAllReports();
    });

    describe('printablePdfV2', () => {
      it('allows width and height to have decimal', async () => {
        const downloadReportPath = await reportingAPI.postJobJSON(
          '/api/reporting/generate/printablePdfV2',
          { jobParams: createPdfV2Params(1541.5999755859375) }
        );
        await retry.tryForTime(60000, async () => {
          const response: supertest.Response = await supertestSvc
            .get(downloadReportPath)
            .responseType('blob')
            .set('kbn-xsrf', 'xxx');
          status(downloadReportPath, response);

          expect(response.status).equal(200);
        });
      });

      it('fails if width or height are non-numeric', async () => {
        const downloadReportPath = await reportingAPI.postJobJSON(
          '/api/reporting/generate/printablePdfV2',
          { jobParams: createPdfV2Params('cucucachoo') }
        );
        await retry.tryForTime(30000, async () => {
          const response: supertest.Response = await supertestSvc
            .get(downloadReportPath)
            .responseType('blob')
            .set('kbn-xsrf', 'xxx');

          expect(response.status).equal(500);
        });
      });

      it('fails if there is an invalid layout ID', async () => {
        const downloadReportPath = await reportingAPI.postJobJSON(
          '/api/reporting/generate/printablePdfV2',
          { jobParams: createPdfV2Params(1541, 'landscape') }
        );
        await retry.tryForTime(30000, async () => {
          const response: supertest.Response = await supertestSvc
            .get(downloadReportPath)
            .responseType('blob')
            .set('kbn-xsrf', 'xxx');

          expect(response.status).equal(500);
        });
      });
    });

    describe('pngV2', () => {
      it('fails if width or height are non-numeric', async () => {
        const downloadReportPath = await reportingAPI.postJobJSON('/api/reporting/generate/pngV2', {
          jobParams: createPngV2Params('cucucachoo'),
        });
        await retry.tryForTime(30000, async () => {
          const response: supertest.Response = await supertestSvc
            .get(downloadReportPath)
            .responseType('blob')
            .set('kbn-xsrf', 'xxx');

          expect(response.status).equal(500);
        });
      });
    });
  });
}
