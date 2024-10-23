/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import type { ReportApiJSON } from '@kbn/reporting-common/types';
import type { CookieCredentials } from '@kbn/ftr-common-functional-services';
import type { FtrProviderContext } from '../../../ftr_provider_context';

const API_HEADER: [string, string] = ['kbn-xsrf', 'reporting'];

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const reportingAPI = getService('svlReportingApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');
  const svlCommonApi = getService('svlCommonApi');
  const internalReqHeader = svlCommonApi.getInternalRequestHeader();
  let cookieCredentials: CookieCredentials;

  const archives = {
    ecommerce: {
      data: 'x-pack/test/functional/es_archives/reporting/ecommerce',
      savedObjects: 'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce',
    },
  };

  describe('Management: Deletion', function () {
    let reportJob: ReportApiJSON;
    let path: string;

    before(async () => {
      cookieCredentials = await samlAuth.getM2MApiCookieCredentialsWithRoleScope('admin');

      await esArchiver.load(archives.ecommerce.data);
      await kibanaServer.importExport.load(archives.ecommerce.savedObjects);

      // generate a report that can be deleted in the test
      const result = await reportingAPI.createReportJobInternal(
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
        cookieCredentials,
        internalReqHeader
      );

      path = result.path;
      reportJob = result.job;

      await reportingAPI.waitForJobToFinish(path, cookieCredentials, internalReqHeader);
    });

    after(async () => {
      await esArchiver.unload(archives.ecommerce.data);
      await kibanaServer.importExport.unload(archives.ecommerce.savedObjects);
    });

    it(`user can delete a report they've created`, async () => {
      const response = await supertestWithoutAuth
        .delete(`${INTERNAL_ROUTES.JOBS.DELETE_PREFIX}/${reportJob.id}`)
        .set(...API_HEADER)
        .set(internalReqHeader)
        .set(cookieCredentials);

      expect(response.status).to.be(200);
      expect(response.body).to.eql({ deleted: true });
    });
  });
};
