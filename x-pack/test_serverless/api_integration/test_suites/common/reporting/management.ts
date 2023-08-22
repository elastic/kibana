/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common/src/constants';
import expect from '@kbn/expect';
import { INTERNAL_ROUTES } from '@kbn/reporting-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';

// the archived data holds a report created by test_user
const TEST_USERNAME = 'test_user';
const TEST_USER_PASSWORD = 'changeme';
const API_HEADER: [string, string] = ['kbn-xsrf', 'reporting'];
const INTERNAL_HEADER: [string, string] = [X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'Kibana'];

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const reportingAPI = getService('svlReportingAPI');
  const supertest = getService('supertestWithoutAuth');

  describe('Reporting Management', function () {
    before(async () => {
      await reportingAPI.createReportingRole();
      await reportingAPI.createReportingUser();
      await reportingAPI.createReportingUser(TEST_USERNAME, TEST_USER_PASSWORD);
    });

    beforeEach(async () => {
      // archived reports has canvas workpad
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce');
    });

    describe('Deletion', () => {
      const DELETE_REPORT_ID = 'krazcyw4156m0763b503j7f9';

      it(`user can delete a report they've created`, async () => {
        const response = await supertest
          .delete(
            `${INTERNAL_ROUTES.JOBS.DELETE_PREFIX}/${DELETE_REPORT_ID}?elasticInternalOrigin=true`
          )
          .auth(TEST_USERNAME, TEST_USER_PASSWORD)
          .set(...API_HEADER)
          .set(...INTERNAL_HEADER);

        expect(response.status).to.be(200);
        expect(response.body).to.eql({ deleted: true });
      });

      it(`user can not delete a report they haven't created`, async () => {
        const response = await supertest
          .delete(
            `${INTERNAL_ROUTES.JOBS.DELETE_PREFIX}/${DELETE_REPORT_ID}?elasticInternalOrigin=true`
          )
          .auth(reportingAPI.REPORTING_USER_USERNAME, reportingAPI.REPORTING_USER_PASSWORD)
          .set(...API_HEADER)
          .set(...INTERNAL_HEADER);

        expect(response.status).to.be(404);
        expect(response.body.message).to.be('Not Found');
      });
    });
  });
};
