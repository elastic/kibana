/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common/src/constants';
import expect from '@kbn/expect';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import { ReportApiJSON } from '@kbn/reporting-common/types';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';

const API_HEADER: [string, string] = ['kbn-xsrf', 'reporting'];
const INTERNAL_HEADER: [string, string] = [X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'Kibana'];

export default ({ getService }: FtrProviderContext) => {
  const log = getService('log');
  const reportingAPI = getService('svlReportingApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  let adminUser: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('Reporting Management', function () {
    before(async () => {
      adminUser = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(adminUser);
    });

    describe('Deletion', () => {
      let reportJob: ReportApiJSON;

      const createJob = async (roleAuthc: RoleCredentials): Promise<ReportApiJSON> => {
        log.info(`request report job with ApiKey ${adminUser.apiKey.name}`);
        const { job } = await reportingAPI.createReportJobInternal(
          'csv_searchsource',
          {
            browserTimezone: 'UTC',
            objectType: 'search',
            searchSource: {
              index: '5193f870-d861-11e9-a311-0fa548c5f953',
              query: { language: 'kuery', query: '' },
              version: true,
            },
            title: 'Ecommerce Data',
            version: '8.15.0',
          },
          roleAuthc,
          internalReqHeader
        );
        log.info(`created report job ${job.id} with ApiKey ${adminUser.apiKey.name}`);
        return job;
      };

      before(async () => {
        reportJob = await createJob(adminUser);
      });

      it(`user can delete a report they've created`, async () => {
        // for this test, we don't need to wait for the job to finish or verify the result
        const response = await supertestWithoutAuth
          .delete(`${INTERNAL_ROUTES.JOBS.DELETE_PREFIX}/${reportJob.id}`)
          .set(...API_HEADER)
          .set(...INTERNAL_HEADER)
          .set(adminUser.apiKeyHeader);

        expect(response.status).to.be(200);
        expect(response.body).to.eql({ deleted: true });
      });
    });
  });
};
